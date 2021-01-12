// OK find packages (from package.json, eg. link:../@webolucio/core)
// OK create package tarball to node_modules/.cache (package-name.tar -> package/package.json)
// OK install tarball
// OK remove tarball
// create links for the rest of the files (blacklist with node_modules, package.json)
// OK restore link: or file: in package.json

const path = require('path');
const find_cache_dir = require('find-cache-dir');

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

module.exports = {
	cwd,
	temp_path,
	modules_dir,
	modules_path,
	manager,
	types,
	ignore_list,
};
