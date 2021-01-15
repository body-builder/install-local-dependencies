const _ = require('lodash');

const getConfig = require('../src/config');
const { install_project, save_package_json, prepare_dependencies } = require('../src/project');
const { delete_tarball } = require('../src/dependency');

async function install_and_link() {
	const { cwd, temp_path, modules_path, manager, types, ignore_list } = await getConfig();

	const { original_package_json, mocked_dependencies, packed_dependencies } = await prepare_dependencies({ types, cwd, temp_path, ignore_list });

	// Mock package.json
	await save_package_json(_.merge({}, original_package_json, mocked_dependencies), { cwd });

	if (!Object.keys(mocked_dependencies).length) {
		// No local dependencies listed in package.json, exit
		return null;
	}

	// Install
	await install_project({ cwd, manager });

	// Delete tarballs
	await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

	// Restore package.json
	await save_package_json(original_package_json, { cwd });

	return packed_dependencies;
}

install_and_link()
	.then((packed_dependencies) => {
		if (packed_dependencies) {
			console.log('Local dependencies installed');
			console.log(packed_dependencies.map(({ package_name, package_version }) => `+ ${package_name} (${package_version})`).join('\n'))
		} else {
			console.log('No local dependencies found to install')
		}
	})
	.catch((e) => {
		console.error('Something went wrong during the installation of the local dependencies', '\n', e);
	});
