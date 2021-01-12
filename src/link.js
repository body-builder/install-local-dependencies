const path = require('path');
const { collect_dependencies_files } = require('./project');
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
	const globed_dependencies = await collect_dependencies_files(packed_dependencies, { cwd, modules_path, ignore_list });

	await Promise.all(globed_dependencies.map(async (dependency) => {
		const { local_package_path, installed_package_path, local_package_files } = dependency;

		return await Promise.all(local_package_files.map(async (file) => {
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
