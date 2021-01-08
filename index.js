// OK find packages (from package.json, eg. link:../@webolucio/core)
// OK create package tarball to node_modules/.cache (package-name.tar -> package/package.json)
// OK install tarball
// OK remove tarball
// create links for the rest of the files (blacklist with node_modules, package.json)
// OK restore link: or file: in package.json

const path = require('path');
const find_cache_dir = require('find-cache-dir');
const _ = require('lodash');

const { delete_tarball } = require('./src/dependency');
const {
	get_package_json,
	save_package_json,
	get_local_dependencies,
	get_mocked_dependencies,
	install_project,
} = require('./src/project');
const { link_dependencies } = require('./src/link');

const TEMP_packages = [
	'@webolucio/core',
	'@webolucio/rc',
];

const cwd = path.resolve('../projekt');
const temp_path = find_cache_dir({ directory: cwd, name: 'install-local-dependencies' });
// const temp_path = '../';

const modules_dir = 'node_modules';
const modules_path = path.resolve(cwd, modules_dir); // `find-cache-dir` doesn't allow to change this

// const manager = 'npm';
// const manager = 'yarn';
const manager = 'pnpm';
const types = ['dependencies', 'devDependencies'];

const ignore_list = ['package.json', 'node_modules'];

// console.log('START', { cwd, temp_path, manager });

async function install_and_link({ manager, types, cwd, temp_path }) {
	// Save original package.json content
	const original_package_json = get_package_json({ cwd });

	const local_dependencies = get_local_dependencies(original_package_json, { types });

	// Create the tarballs, and get the mocked dependency paths
	const { mocked_dependencies, packed_dependencies } = await get_mocked_dependencies(local_dependencies, { temp_path });

	if (!Object.keys(mocked_dependencies).length) {
		// No local dependencies listed in package.json, exit
		return false;
	}

	// Mock package.json
	await save_package_json(_.merge({}, original_package_json, mocked_dependencies), { cwd });

	// Install
	await install_project({ cwd, manager });

	// Delete tarballs
	await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

	// Restore package.json
	await save_package_json(original_package_json, { cwd });

	// Create hardlinks
	await link_dependencies(packed_dependencies, { cwd, modules_path, ignore_list });

	return true;
}

install_and_link({ cwd, temp_path, manager, types, ignore_list })
	.then((installed) => installed && console.log('Local dependencies installed'))
	.catch((e) => {
		console.error('Something went wrong when installing local dependencies', '\n', e);
	});
