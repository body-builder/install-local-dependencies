const path = require('path');
const find_cache_dir = require('find-cache-dir');

const cwd = path.resolve('../projekt');
const temp_path = find_cache_dir({ cwd, name: 'install-local-dependencies' });
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
