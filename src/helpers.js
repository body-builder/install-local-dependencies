const path = require('path');
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

// https://github.com/npm/npm-packlist/blob/main/index.js#L37
const default_ignore_rules = [
	'.npmignore',
	'.gitignore',
	'**/.git',
	'**/.svn',
	'**/.hg',
	'**/CVS',
	'**/.git/**',
	'**/.svn/**',
	'**/.hg/**',
	'**/CVS/**',
	'/.lock-wscript',
	'/.wafpickle-*',
	'/build/config.gypi',
	'npm-debug.log',
	'**/.npmrc',
	'.*.swp',
	'.DS_Store',
	'**/.DS_Store/**',
	'._*',
	'**/._*/**',
	'*.orig',
	'/package-lock.json',
	'/yarn.lock',
	'/archived-packages/**',
];

// https://stackoverflow.com/a/41407246/3111787
// https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
const console_colors = {
	Reset: '\x1b[0m',
	Bright: '\x1b[1m',
	Dim: '\x1b[2m',
	Underscore: '\x1b[4m',
	Blink: '\x1b[5m',
	Reverse: '\x1b[7m',
	Hidden: '\x1b[8m',

	FgBlack: '\x1b[30m',
	FgRed: '\x1b[31m',
	FgGreen: '\x1b[32m',
	FgYellow: '\x1b[33m',
	FgBlue: '\x1b[34m',
	FgMagenta: '\x1b[35m',
	FgCyan: '\x1b[36m',
	FgWhite: '\x1b[37m',

	BgBlack: '\x1b[40m',
	BgRed: '\x1b[41m',
	BgGreen: '\x1b[42m',
	BgYellow: '\x1b[43m',
	BgBlue: '\x1b[44m',
	BgMagenta: '\x1b[45m',
	BgCyan: '\x1b[46m',
	BgWhite: '\x1b[47m',

	FgBrightBlack: '\x1b[90m',
	FgBrightRed: '\x1b[91m',
	FgBrightGreen: '\x1b[92m',
	FgBrightYellow: '\x1b[93m',
	FgBrightBlue: '\x1b[94m',
	FgBrightMagenta: '\x1b[95m',
	FgBrightCyan: '\x1b[96m',
	FgBrightWhite: '\x1b[97m',

	BgBrightBlack: '\x1b[100m',
	BgBrightRed: '\x1b[101m',
	BgBrightGreen: '\x1b[102m',
	BgBrightYellow: '\x1b[103m',
	BgBrightBlue: '\x1b[104m',
	BgBrightMagenta: '\x1b[105m',
	BgBrightCyan: '\x1b[106m',
	BgBrightWhite: '\x1b[107m',
}

function color_log(msg, color) {
	return `${color}${msg}${console_colors.Reset}`;
}

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
		return await promisified.fse.lstat(file_path);
	} catch (e) {
		return null;
	}
}

async function remove_file_or_directory(file_path) {
	const stats = await get_file_stats(file_path);

	if (!stats) {
		return;
	}

	// console.log('DELETE', file_path);

	return promisified.rimraf(file_path);
}

async function copy_file_or_directory(source_path, destination_path) {
	const stats = await get_file_stats(source_path);

	if (!stats) {
		return;
	}

	const is_directory = stats.isDirectory();

	if (is_directory) {
		return promisified.fs.mkdir(destination_path);
	}

	// console.log('COPY', source_path, 'to', destination_path);

	return promisified.fse.copy(source_path, destination_path);
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

/**
 * Converts your path `p` to POSIX format irrespective of whether you're already on POSIX platforms, or on win32
 * @param p path string
 * @see https://stackoverflow.com/a/63251716/3111787
 */
function definitely_posix(p) {
	return p.split(path.sep).join(path.posix.sep);
}

module.exports = {
	validate_path,
	get_file_stats,
	remove_file_or_directory,
	copy_file_or_directory,
	detect_newline_at_eof,
	sleep,
	definitely_posix,
	default_ignore_rules,
	promisified,
	console_colors,
	color_log,
};
