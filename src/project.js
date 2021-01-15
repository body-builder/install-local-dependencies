const path = require('path');
const chokidar = require('chokidar');
const execSh = require('exec-sh').promise;
const _ = require('lodash');

const { create_tarball } = require('./dependency');
const { remove_file_or_directory, copy_file_or_directory, detect_newline_at_eof, sleep, promisified } = require('./helpers');

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
 * @param ignore_list {string[]}
 * @returns {Promise<{mocked_dependencies, created_tarballs: []}>}
 */
async function get_mocked_dependencies(local_dependencies, { temp_path, ignore_list }) {
	const mocked_dependencies = _.cloneDeep(local_dependencies);
	const packed_dependencies = [];

	// Iterate over `dependencies`, `devDependencies` object
	await Promise.all(Object.keys(local_dependencies).map(async (type) => {
		const type_object = local_dependencies[type];

		return await Promise.all(Object.entries(type_object).map(async ([name, version]) => {
			const tarball = await create_tarball({ name, version }, { temp_path, ignore_list });

			mocked_dependencies[type][name] = tarball.tarball_path;

			if (packed_dependencies.indexOf(tarball.tarball_path) === -1) {
				packed_dependencies.push(tarball);
			}
		}));
	}));

	return { mocked_dependencies, packed_dependencies };
}

async function prepare_dependencies({ types, cwd, temp_path, ignore_list }) {
	// Save original package.json content
	const original_package_json = get_package_json({ cwd });

	const local_dependencies = get_local_dependencies(original_package_json, { types });

	// Create the tarballs, and get the mocked dependency paths
	const { mocked_dependencies, packed_dependencies } = await get_mocked_dependencies(local_dependencies, { temp_path, ignore_list });

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
		const { local_dependency_name, local_dependency_path, local_package_files } = dependency;
		const local_package_path = path.resolve(cwd, local_dependency_path); // source
		const installed_package_path = path.resolve(modules_path, local_dependency_name); // target

		if (!await promisified.fs.exists(installed_package_path)) {
			throw new Error(`Could not find the installed package '${local_dependency_name}' in '${installed_package_path}'`);
		}

		return {
			local_dependency_name,
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


/**
 * @param packed_dependencies {array}
 * @param cwd {string}
 * @param modules_path {string}
 * @param ignore_list {string}
 * @returns {Promise<void>}
 */
async function copy_dependencies(packed_dependencies, { cwd, modules_path, ignore_list }) {
	// console.log('copy_dependencies');
	const globed_dependencies = await collect_dependencies_files(packed_dependencies, { cwd, modules_path, ignore_list });

	const all_dependencies_files = await collect_dependencies_files_flat(globed_dependencies);

	// Delete files
	// we should do this in two steps, to avoid possible deletion of already linked files (when a folder gets )
	await Promise.all(all_dependencies_files.map(async ({ local_path, installed_path }) => {
		return remove_file_or_directory(installed_path);
	}));

	// Link files
	await Promise.all(all_dependencies_files.map(async ({ local_path, installed_path }) => {
		return copy_file_or_directory(local_path, installed_path);
	}));
}

async function watch_dependencies(packed_dependencies, { cwd, modules_path, ignore_list }) {
	// console.log('watch_dependencies');
	const globed_dependencies = await collect_dependencies_files(packed_dependencies, { cwd, modules_path, ignore_list });

	const files_to_watch = globed_dependencies.map(({ local_package_path }) => `${local_package_path}/.`);
	const ignore_glob = `{${ignore_list.map((rule) => `**/${rule}`).join(',')}}`;

	const watcher = chokidar.watch(files_to_watch, {
		ignored: ignore_glob,
	});

	/**
	 * Find the package to which the requested file belongs to
	 * @param source_path
	 * @returns {{filename: string, source_path, target_path: string}}
	 */
	function get_target_path(source_path) {
		const parent_dependency = globed_dependencies.find(({ local_package_path }) => source_path.startsWith(local_package_path));

		if (!parent_dependency) {
			throw new Error(`Could not find the package to which the file belongs to: '${source_path}'`);
		}

		const filename = path.relative(parent_dependency.local_package_path, source_path);
		const target_path = path.resolve(parent_dependency.installed_package_path, filename);

		return {
			package_name: parent_dependency.local_dependency_name,
			source_path,
			filename,
			target_path,
		};
	}

	async function watch_delayed_log(msg = 'Watching local dependencies for changes', timeout = 1000, clear = true) {
		await sleep(1000);
		if (clear) {
			console.clear();
		}
		console.log(msg);
		console.log(globed_dependencies.map(({ local_dependency_name }) => `${local_dependency_name}`).join('\n'))
	}

	let isReady = false;

	watcher
		.on('ready', async () => {
			await watch_delayed_log();
			isReady = true;
		})
		.on('add', async (source_path) => {
			const { target_path, package_name, filename } = get_target_path(source_path);
			await copy_file_or_directory(source_path, target_path);
			if (isReady) {
				console.log(`${package_name}/${filename}`, 'added');
				await watch_delayed_log(); // We do not need it here, as `ready` already creates a log
			}
		})
		.on('change', async (source_path) => {
			const { target_path, package_name, filename } = get_target_path(source_path);
			await copy_file_or_directory(source_path, target_path);
			console.log(`${package_name}/${filename}`, 'changed');
			await watch_delayed_log();
		})
		.on('unlink', async (source_path) => {
			const { target_path, package_name, filename } = get_target_path(source_path);
			await remove_file_or_directory(target_path);
			console.log(`${package_name}/${filename}`, 'deleted');
			await watch_delayed_log();
		});

	process
		.on('SIGINT', async () => {
			// console.log('SIGINT, closing watcher');
			await watcher.close();
			console.log('\nLocal dependency watcher gracefully shut down.');
		})
		.on('SIGTERM', async () => {
			// console.log('SIGTERM, closing watcher');
			await watcher.close();
			console.log('\nLocal dependency watcher gracefully shut down.');
		});
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
	copy_dependencies,
	watch_dependencies,
};