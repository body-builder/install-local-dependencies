const path = require('path');
const execSh = require('exec-sh').promise;
const globby = require('globby');
const _ = require('lodash');

const { create_tarball } = require('./dependency');
const { detect_newline_at_eof, promisified } = require('./helpers');

/**
 * Returns the content of the package.json in the `cwd`
 * @param cwd {string}
 * @returns {object}
 */
function get_package_json({ cwd }) {
	const package_json_path = path.resolve(cwd, 'package.json');
	return require(package_json_path);
}

/**
 * Saves the given object to the package.json file
 * @param content {object}
 * @param cwd {string}
 * @returns {Promise<void>}
 */
async function save_package_json(content, { cwd }) {
	// console.log('save_package_json')
	const package_json_path = path.resolve(cwd, 'package.json');

	const newline_char = await detect_newline_at_eof(package_json_path);

	promisified.fs.writeFile(package_json_path, JSON.stringify(content, null, 2) + newline_char);
}

/**
 * Checks whether the given dependency version descriptor refers to a local package
 * @param version {string}
 */
function is_local_package(version) {
	return version.startsWith('file:') || version.startsWith('link:');
}

function get_local_package_path(version) {
	return version
		.replace(/^file:/, '')
		.replace(/^link:/, '');
}

/**
 * Starts an `$ (npm|yarn|pnpm) install` action in the project
 * @param cwd
 * @param manager
 * @returns {Promise<void>}
 */
async function install_project({ cwd, manager }) {
	// console.log('install_project');
	try {
		await execSh(`${manager} install`, { cwd });
	} catch (e) {
		console.log(e);
		throw new Error(`Could not run '${manager} install' script in ${cwd}`);
	}
}

/**
 * Returns the items of the dependencies/devDependencies object(s), wh
 * @param package_json_content
 * @param types The dependency types to analyze (eg. `dependencies`, `devDependencies`)
 * @returns {{}}
 */
function get_local_dependencies(package_json_content, { types }) {
	const local_packages = {};

	// Iterate over `dependencies`, `devDependencies` object
	types.forEach((type) => {
		const type_object = package_json_content[type];

		if (!type_object) {
			return;
		}

		// Iterate over the packages
		Object.entries(type_object).forEach(([name, version]) => {
			if (is_local_package(version)) {
				local_packages[type] = local_packages[type] || {};
				local_packages[type][name] = get_local_package_path(version);
			}
		});
	});

	return local_packages;
}

/**
 * @param local_dependencies {object}
 * @param temp_path {string}
 * @returns {Promise<{mocked_dependencies, created_tarballs: []}>}
 */
async function get_mocked_dependencies(local_dependencies, { temp_path }) {
	const mocked_dependencies = _.cloneDeep(local_dependencies);
	const packed_dependencies = [];

	// Iterate over `dependencies`, `devDependencies` object
	await Promise.all(Object.keys(local_dependencies).map(async (type) => {
		const type_object = local_dependencies[type];

		return await Promise.all(Object.entries(type_object).map(async ([name, version]) => {
			const tarball = await create_tarball({ name, version }, { temp_path });

			mocked_dependencies[type][name] = tarball.tarball_path;

			if (packed_dependencies.indexOf(tarball.tarball_path) === -1) {
				packed_dependencies.push(tarball);
			}
		}));
	}));

	return { mocked_dependencies, packed_dependencies };
}

async function prepare_dependencies({ types, cwd, temp_path }) {
	// Save original package.json content
	const original_package_json = get_package_json({ cwd });

	const local_dependencies = get_local_dependencies(original_package_json, { types });

	// Create the tarballs, and get the mocked dependency paths
	const { mocked_dependencies, packed_dependencies } = await get_mocked_dependencies(local_dependencies, { temp_path });

	// This contains all the required data to install the dependencies, or only recreate the hardlinks
	return { original_package_json, local_dependencies, mocked_dependencies, packed_dependencies };
}

async function collect_dependencies_files(packed_dependencies, { cwd, modules_path, ignore_list }) {
	// console.log('collect_dependencies_files');
	if (!Array.isArray(packed_dependencies)) {
		throw new Error('No data received to link the dependencies.');
	}

	if (!await promisified.fs.exists(modules_path)) {
		throw new Error(`Could not find the modules directory. Tried: '${modules_path}'`);
	}

	return Promise.all(packed_dependencies.map(async (dependency) => {
		const { local_dependency_name, local_dependency_path } = dependency;
		const local_package_path = path.resolve(cwd, local_dependency_path); // source
		const installed_package_path = path.resolve(modules_path, local_dependency_name); // target

		if (!await promisified.fs.exists(installed_package_path)) {
			throw new Error(`Could not find the installed package '${local_dependency_name}' in '${installed_package_path}'`);
		}

		const local_package_files = await globby('**/*', {
			cwd: local_package_path,
			dot: true,
			onlyFiles: false,
			markDirectories: true,
			ignore: ignore_list,
		});

		return {
			local_package_path,
			installed_package_path,
			local_package_files,
		};
	}));
}

async function collect_dependencies_files_flat(globed_dependencies) {
	const all_dependencies_files = await Promise.all(globed_dependencies.map(async (dependency) => {
		const { local_package_path, installed_package_path, local_package_files } = dependency;

		// Link files
		return await Promise.all(local_package_files.map(async (file) => {
			const local_path = path.resolve(local_package_path, file); // A path to the existing file
			const installed_path = path.resolve(installed_package_path, file); // A path to the new link

			return { local_path, installed_path };
		}));
	}));

	return all_dependencies_files.flat();
}

module.exports = {
	get_package_json,
	save_package_json,
	install_project,
	get_local_dependencies,
	get_mocked_dependencies,
	prepare_dependencies,
	collect_dependencies_files,
	collect_dependencies_files_flat,
};