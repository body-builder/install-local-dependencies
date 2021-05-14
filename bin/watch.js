#!/usr/bin/env node

const getConfig = require('../src/config');
const { prepare_dependencies, watch_dependencies } = require('../src/project');
const { delete_tarball } = require('../src/dependency');

async function watch() {
	const { cwd, temp_path, modules_path, manager, types, ignored_files, ignored_packages } = await getConfig();

	const { mocked_dependencies, packed_dependencies } = await prepare_dependencies({
		types,
		cwd,
		temp_path,
		ignored_files,
		ignored_packages,
	});

	// Delete tarballs
	await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

	if (!Object.keys(mocked_dependencies).length) {
		// No local dependencies listed in package.json, exit
		return null;
	}

	await watch_dependencies(packed_dependencies, { cwd, modules_path, ignored_files });

	return packed_dependencies;
}

watch()
	.then((packed_dependencies) => {
		if (packed_dependencies) {
			console.log('Starting the local dependency watcher...');
		} else {
			console.log('No local dependencies found to watch')
		}
	})
	.catch((e) => {
		console.error('Something went wrong during watching the local dependencies', '\n', e);
	});
