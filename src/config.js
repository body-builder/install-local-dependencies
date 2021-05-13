const path = require('path');
const { cosmiconfig } = require('cosmiconfig');
const find_cache_dir = require('find-cache-dir');
const this_package_json = require('../package.json');

async function config() {
	const cwd = process.cwd(); // TODO possiblity for process.args

	const explorer = cosmiconfig('localdependencies');
	const result = await explorer.search(cwd);

	const { config: project_config } = result || {};

	const default_config = {
		cwd,
		temp_path: find_cache_dir({ cwd, name: 'install-local-dependencies' }),
		modules_dir: 'node_modules',
		manager: 'npm',
		install_args: '',
		types: ['dependencies', 'devDependencies'],
		ignored_files: ['package.json', 'node_modules'],
		ignored_packages: [],
	};

	const config = {
		...default_config,
		...project_config,
	};

	config.modules_path = path.resolve(config.cwd, config.modules_dir); // `find-cache-dir` doesn't allow to change this
	config.ignored_packages = config.ignored_packages.concat(this_package_json.name); // This plugin should not touch itself

	// console.log('START', config);

	return config;
}

module.exports = config;
