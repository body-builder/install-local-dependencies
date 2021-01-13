const { cwd, temp_path, modules_path, types, ignore_list } = require('../src/index');
const { prepare_dependencies, watch_dependencies } = require('../src/project');
const { delete_tarball } = require('../src/dependency');

async function watch() {
	const { mocked_dependencies, packed_dependencies } = await prepare_dependencies({ types, cwd, temp_path });

	// Delete tarballs
	await Promise.all(packed_dependencies.map(({ tarball_name }) => delete_tarball(tarball_name, { temp_path })));

	if (!Object.keys(mocked_dependencies).length) {
		// No local dependencies listed in package.json, exit
		return false;
	}

	await watch_dependencies(packed_dependencies, { cwd, modules_path, ignore_list });
}

watch()
	.then((installed) => installed && console.log('Watching local dependencies'))
	.catch((e) => {
		console.error('Something went wrong while watching local dependencies', '\n', e);
	});
