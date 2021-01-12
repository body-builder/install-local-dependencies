const path = require('path');
const { collect_dependencies_files } = require('./project');
const { promisified, get_file_stats } = require('./helpers');

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

		// Delete files
		// we should do this in two steps, to avoid possible deletion of already linked files (when a folder gets )
		await Promise.all(local_package_files.map(async (file) => {
			const link_path = path.resolve(installed_package_path, file); // A path to the new link

			return unlink_file_or_directory(link_path);
		}));

		// Link files
		return await Promise.all(local_package_files.map(async (file) => {
			const link_target = path.resolve(local_package_path, file); // A path to the existing file
			const link_path = path.resolve(installed_package_path, file); // A path to the new link

			return link_file_or_directory(link_target, link_path);
		}));
	}));
}

async function unlink_file_or_directory(file_path) {
	const stats = await get_file_stats(file_path);

	if (!stats) {
		return;
	}

	return promisified.rimraf(file_path);
}

async function link_file_or_directory(link_target, link_path) {
	const stats = await get_file_stats(link_target);

	if (!stats) {
		return;
	}

	const is_directory = stats.isDirectory();

	if (is_directory) {
		return promisified.fs.mkdir(link_path);
	}

	return promisified.fs.link(link_target, link_path);
}

module.exports = {
	link_dependencies,
};
