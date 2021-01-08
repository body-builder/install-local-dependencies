const path = require('path');
const globby = require('globby');

const { promisified } = require('./helpers');

/**
 * @param packed_dependencies {array}
 * @param cwd {string}
 * @param modules_path {string}
 * @param ignore_list {string}
 * @returns {Promise<void>}
 */
async function link_dependencies(packed_dependencies, { cwd, modules_path, ignore_list }) {
	// console.log('link_dependencies');
	if (!Array.isArray(packed_dependencies)) {
		throw new Error('No data received to link the dependencies.');
	}

	if (!await promisified.fs.exists(modules_path)) {
		throw new Error(`Could not find the modules directory. Tried: '${modules_path}'`);
	}

	await Promise.all(packed_dependencies.map(async (dependency) => {
		const { local_dependency_name, local_dependency_path } = dependency;
		const local_package_path = path.resolve(cwd, local_dependency_path); // source
		const installed_package_path = path.resolve(modules_path, local_dependency_name); // target

		if (!await promisified.fs.exists(installed_package_path)) {
			throw new Error(`Could not find the installed package '${local_dependency_name}' in '${installed_package_path}'`);
		}

		const files_to_link = await globby('**/*', {
			cwd: local_package_path,
			dot: true,
			onlyFiles: false,
			markDirectories: true,
			ignore: ignore_list,
		});

		await Promise.all(files_to_link.map((file) => {
			const link_target = path.resolve(local_package_path, file); // A path to the existing file
			const link_path = path.resolve(installed_package_path, file); // A path to the new link

			const is_directory = file.endsWith('/');

			if (is_directory) {
				return promisified.fs.mkdir(link_path, { recursive: true });
			}

			return promisified.fs.link(link_target, link_path);
		}));
	}));
}

module.exports = {
	link_dependencies,
};
