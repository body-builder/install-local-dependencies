#!/usr/bin/env node

const _ = require('lodash');

const getConfig = require('../src/config');
const { install_project, save_package_json, prepare_dependencies } = require('../src/project');
const { delete_tarball } = require('../src/dependency');
const { color_log, console_colors } = require('../src/helpers');

async function install() {
	const {
		cwd,
		temp_path,
		manager,
		install_args,
		types,
		ignored_packages,
	} = await getConfig();

	const { original_package_json, mocked_dependencies, packed_dependencies } = await prepare_dependencies({
		types,
		cwd,
		temp_path,
		ignored_packages,
	});

	// Mock package.json
	await save_package_json(_.merge({}, original_package_json, mocked_dependencies), { cwd });

	if (!Object.keys(mocked_dependencies).length) {
		// No local dependencies listed in package.json, exit
		return null;
	}

	process.on('SIGINT', async (event, code) => {
		await save_package_json(original_package_json, { cwd });
		process.exit(code);
	});

	process.on('SIGTERM', async (event, code) => {
		await save_package_json(original_package_json, { cwd });
		process.exit(code);
	});

	// Install
	try {
		await install_project({ cwd, manager, install_args });
	} finally {
		// Restore package.json
		await save_package_json(original_package_json, { cwd });
	}

	// Delete tarballs
	await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

	return packed_dependencies;
}

install()
	.then((packed_dependencies) => {
		if (packed_dependencies) {
			console.log('Local dependencies installed');
			console.log(packed_dependencies.map(({
				package_name,
				package_version,
			}) => `${color_log('+', console_colors.FgGreen)} ${package_name} ${color_log(`(${package_version})`, console_colors.FgBrightBlack)}`).join('\n'));
		} else {
			console.log('No local dependencies found to install');
		}
	})
	.catch((e) => {
		console.error('Something went wrong during the installation of the local dependencies', '\n', e);
	});
