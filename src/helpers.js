const fs = require('fs');
const pify = require('pify');
const rimraf = require('rimraf');

const promisified = {
	fs: {
		...pify(fs),
		exists: pify(fs.exists, { errorFirst: false }),
	},
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

module.exports = {
	validate_path,
	get_file_stats,
	detect_newline_at_eof,
	promisified,
};