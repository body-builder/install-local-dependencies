const path = require('path');
const { cosmiconfig } = require('cosmiconfig');
const find_cache_dir = require('find-cache-dir');

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
		types: ['dependencies', 'devDependencies'],
		ignore_list: ['package.json', 'node_modules'],
	};

	const config = {
		...default_config,
		...project_config,
	};

	config.modules_path = path.resolve(config.cwd, config.modules_dir); // `find-cache-dir` doesn't allow to change this

	// console.log('START', config);

	return config;
}

module.exports = config;
