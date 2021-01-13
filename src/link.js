const { collect_dependencies_files, collect_dependencies_files_flat } = require('./project');
const { promisified, get_file_stats } = require('./helpers');

/**
 * @param packed_dependencies {array}
 * @param cwd {string}
 * @param modules_path {string}
 * @param ignore_list {string}
 * @returns {Promise<void>}
 */
async function copy_dependencies(packed_dependencies, { cwd, modules_path, ignore_list }) {
	// console.log('copy_dependencies');
	const globed_dependencies = await collect_dependencies_files(packed_dependencies, { cwd, modules_path, ignore_list });

	const all_dependencies_files = await collect_dependencies_files_flat(globed_dependencies);

	// Delete files
	// we should do this in two steps, to avoid possible deletion of already linked files (when a folder gets )
	await Promise.all(all_dependencies_files.map(async ({ local_path, installed_path }) => {
		return remove_file_or_directory(installed_path);
	}));

	// Link files
	await Promise.all(all_dependencies_files.map(async ({ local_path, installed_path }) => {
		return copy_file_or_directory(local_path, installed_path);
	}));
}

async function remove_file_or_directory(file_path) {
	const stats = await get_file_stats(file_path);

	if (!stats) {
		return;
	}

	return promisified.rimraf(file_path);
}

async function copy_file_or_directory(link_target, link_path) {
	const stats = await get_file_stats(link_target);

	if (!stats) {
		return;
	}

	const is_directory = stats.isDirectory();

	if (is_directory) {
		return promisified.fs.mkdir(link_path);
	}

	return promisified.fse.copy(link_target, link_path);
}

module.exports = {
	copy_dependencies,
};
