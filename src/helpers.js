const fs = require('fs');
const fse = require('fs-extra');
const pify = require('pify');
const rimraf = require('rimraf');

const promisified = {
	fs: {
		...pify(fs),
		exists: pify(fs.exists, { errorFirst: false }),
	},
	fse: pify(fse),
	rimraf: pify(rimraf),
};

/**
 * Makes sure that the given folder exists - creates if not
 * @param path {string}
 */
async function validate_path(path) {
	if (!await promisified.fs.exists(path)) {
		await promisified.fs.mkdir(path, { recursive: true });
	}
}

/**
 * Error-safe `fs.lstat` - returns stats if the file exists, otherwise null
 * @param file_path
 * @returns {Promise<*|null>}
 */
async function get_file_stats(file_path) {
	try {
		return await promisified.fs.lstat(file_path);
	} catch (e) {
		return null;
	}
}

async function remove_file_or_directory(file_path) {
	const stats = await get_file_stats(file_path);

	if (!stats) {
		return;
	}

	console.log('DELETE', file_path);

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

	console.log('COPY', link_target, 'to', link_path);

	return promisified.fse.copy(link_target, link_path);
}

/**
 * credits: https://github.com/sonicdoe/detect-newline-at-eof
 * @param path {string}
 * @returns {Promise<null|*>}
 */
async function detect_newline_at_eof(path) {
	const fileContents = await promisified.fs.readFile(path, 'utf-8');

	const matches = fileContents.match(/\r?\n$/);

	if (matches) {
		return matches[0];
	}

	return null;
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
	validate_path,
	get_file_stats,
	remove_file_or_directory,
	copy_file_or_directory,
	detect_newline_at_eof,
	sleep,
	promisified,
};