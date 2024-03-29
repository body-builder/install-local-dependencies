const fs = require('fs');
const path = require('path');
const packlist = require('npm-packlist');
const tar = require('tar');
const execSh = require('exec-sh').promise;

const { validate_path, default_ignore_rules, definitely_posix } = require('./helpers');

/**
 *
 * @param relative_package_path {string}
 * @returns {{package_json_path: string, package_path: string, package_json_filename: string, package_json_content: *}}
 */
function get_package_details(relative_package_path) {
	const package_path = path.resolve(relative_package_path);

	if (!fs.existsSync(package_path)) {
		throw new Error(`Module '${relative_package_path}' was not found in '${path.resolve()}'.`);
	}

	const package_json_filename = 'package.json';
	const package_json_path = path.resolve(package_path, package_json_filename);
	const package_json_content = require(package_json_path);

	return {
		package_path,
		package_json_filename,
		package_json_path,
		package_json_content,
	};
}

/**
 * Returns the Array of the ignore-rules based on the root `.npmignore` file, or if that doesn't exist, based on the root `.gitignore` file
 * @param relative_package_path
 * @returns {Promise<*[]|*>}
 */
async function get_ignore_file_rules(relative_package_path) {
	const npmignorePath = path.resolve(relative_package_path, '.npmignore');
	const gitignorePath = path.resolve(relative_package_path, '.gitignore');

	let ignorefile;

	try {
		// try to read .npmignore
		ignorefile = await fs.promises.readFile(npmignorePath, 'utf-8');
	} catch (e) {
		// .npmignore not found, try to read .gitignore
		try {
			ignorefile = await fs.promises.readFile(gitignorePath, 'utf-8');
		} catch (e) {
			// No ignore file found
			return [];
		}
	}

	return ignorefile
		.split('\n')
		.filter(Boolean) // Empty lines
		.filter((line) => !line.trim().startsWith('#')); // Comments
}

/**
 * Returns the list of the
 * @param relative_package_path
 * @returns {Promise<*[]>}
 */
async function get_ignore_rules(relative_package_path) {
	const local_ignore_rules = await get_ignore_file_rules(relative_package_path);

	const all_rules = [
		'node_modules', // We don't manage `bundledDependencies` in watch mode!
		...default_ignore_rules,
		...local_ignore_rules,
	];

	return all_rules.map((pattern) => definitely_posix(path.join(relative_package_path, pattern)));
}

/**
 * Returns an NPM-style tarball filename (without extension)
 * @param name {string}
 * @param version {string}
 * @returns {string}
 */
function filename_from_package_name(name, version) {
	if (typeof name !== 'string' || !name.length) {
		throw new Error('Package name must be string.');
	}

	const safe_name = name
		.replace(/^@/, '')
		.replace('/', '-');

	// remove empty elements (eg. if version is missing) from the Array
	const filename_parts = [safe_name, version].filter(Boolean);

	return filename_parts.join('-');
}

/**
 * Creates an NPM-style tarball, containing only the package.json of the given local NPM module
 * @param local_dependency_name
 * @param local_dependency_path
 * @param temp_path
 * @returns {Promise<string>}
 */
async function create_tarball({ name: local_dependency_name, version: local_dependency_path }, { temp_path }) {
	// console.log('create_tarball', local_dependency_path);
	const {
		package_path,
		package_json_content,
	} = await get_package_details(local_dependency_path);

	const { name: package_name, version: package_version } = package_json_content;

	const tarball_name = `${filename_from_package_name(package_name, package_version)}.tgz`;
	const tarball_path = path.resolve(temp_path, tarball_name);

	const local_package_files = await packlist({ path: package_path });

	try {
		await validate_path(temp_path);
		await tar.create({
				prefix: 'package/',
				cwd: package_path,
				file: tarball_path,
				gzip: true,
			},
			local_package_files,
		);
	} catch (e) {
		console.log(e);
		throw new Error(`Could not pack module '${local_dependency_path}'`);
	}

	if (!fs.existsSync(tarball_path)) {
		throw new Error(`Could not locate the created tarball '${tarball_name}' in '${temp_path}'.`);
	}

	return {
		package_name,
		package_version,
		local_package_files,
		tarball_name,
		tarball_path,
		local_dependency_name,
		local_dependency_path,
	};
}

/**
 * Installs a single tarball
 * @param tarball_name
 * @param temp_path
 * @param cwd
 * @param manager
 * @returns {Promise<void>}
 */
async function install_tarball(tarball_name, { temp_path, cwd, manager = 'pnpm' }) {
	// console.log('install_tarball', tarball_name);
	const tarball_path = path.resolve(temp_path, tarball_name);

	try {
		await execSh(`${manager} add ${tarball_path}`, { cwd });
	} catch (e) {
		console.log(e);
		throw new Error(`Could not install tarball '${tarball_name}'`);
	}

	return tarball_name;
}

/**
 * Deletes the given tarball from the file system
 * @param tarball_name
 * @param temp_path
 * @returns {Promise<void>}
 */
async function delete_tarball(tarball_name, { temp_path }) {
	// console.log('delete_tarball', tarball_name);
	const tarball_path = path.resolve(temp_path, tarball_name);
	await fs.promises.unlink(tarball_path);
}

module.exports = {
	get_ignore_file_rules,
	get_ignore_rules,
	create_tarball,
	install_tarball,
	delete_tarball,
};
