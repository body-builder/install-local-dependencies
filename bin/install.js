#!/usr/bin/env node

const _ = require('lodash');

const getConfig = require('../src/config');
const { install_project, save_package_json, prepare_dependencies } = require('../src/project');
const { delete_tarball } = require('../src/dependency');
const { color_log, console_colors } = require('../src/helpers');

async function install_and_link() {
	const {
		cwd,
		temp_path,
		modules_path,
		manager,
		install_args,
		types,
		ignored_files,
		ignored_packages,
	} = await getConfig();

	const { original_package_json, mocked_dependencies, packed_dependencies } = await prepare_dependencies({
		types,
		cwd,
		temp_path,
		ignored_files,
		ignored_packages,
	});

	// Mock package.json
	await save_package_json(_.merge({}, original_package_json, mocked_dependencies), { cwd });

	if (!Object.keys(mocked_dependencies).length) {
		// No local dependencies listed in package.json, exit
		return null;
	}

	// Restore package.json (we do not want to wait for the end of the install script, to minimize the chance for the mocked
	// content to remain in the package.json file, if something goes wrong, or the client terminates the install process)
	setTimeout(() => save_package_json(original_package_json, { cwd }), 1000);

	// Install
	await install_project({ cwd, manager, install_args });

	// Delete tarballs
	await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

	return packed_dependencies;
}

install_and_link()
	.then((packed_dependencies) => {
		if (packed_dependencies) {
			console.log('Local dependencies installed');
			console.log(packed_dependencies.map(({ package_name, package_version }) => `${color_log('+', console_colors.FgGreen)} ${package_name} ${color_log(`(${package_version})`, console_colors.FgBrightBlack)}`).join('\n'))
		} else {
			console.log('No local dependencies found to install')
		}
	})
	.catch((e) => {
		console.error('Something went wrong during the installation of the local dependencies', '\n', e);
	});
