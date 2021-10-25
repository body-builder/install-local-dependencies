#!/usr/bin/env node

const _ = require('lodash');

const getConfig = require('../src/config');
const { run_script, prepare_dependencies, save_package_json, watch_dependencies } = require('../src/project');
const { delete_tarball } = require('../src/dependency');

async function ldm() {
	const {
		cwd,
		temp_path,
		modules_path,
		manager,
		types,
		ignored_packages,
	} = await getConfig();

	const { original_package_json, mocked_dependencies, packed_dependencies } = await prepare_dependencies({
		types,
		cwd,
		temp_path,
		ignored_packages,
	});

	const [command, ...args] = process.argv.slice(2);

	switch (command) {
		case 'watch': {
			// Delete tarballs
			await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

			if (!Object.keys(mocked_dependencies).length) {
				// No local dependencies listed in package.json, exit
				return null;
			}

			await watch_dependencies(packed_dependencies, { cwd, modules_path });

			return packed_dependencies;
		}
		default: {
			// Mock package.json
			await save_package_json(_.merge({}, original_package_json, mocked_dependencies), { cwd });

			if (!Object.keys(mocked_dependencies).length) {
				// No local dependencies listed in package.json, exit
				return null;
			}

			// Restore package.json (we do not want to wait for the end of the install script, to minimize the chance for the mocked
			// content to remain in the package.json file, if something goes wrong, or the client terminates the install process)
			// TODO We should restore not the complete package json, only the local dependency-related lines, as we could install/uninstall other packages!
			setTimeout(() => save_package_json(original_package_json, { cwd }), 1000);

			// Run script
			await run_script({ cwd, manager, command, args })

			// Delete tarballs
			await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

			return packed_dependencies;
		}
	}
}

ldm()
	.then((packed_dependencies) => {});
