# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.4](https://github.com/body-builder/install-local-dependencies/compare/v0.2.3...v0.2.4) (2022-09-23)


### Bug Fixes

* package.json getting postended with "null" ([bfd4b21](https://github.com/body-builder/install-local-dependencies/commit/bfd4b21d3d57ed01cc4efe1cb434bd7390c60428))

### [0.2.3](https://github.com/body-builder/install-local-dependencies/compare/v0.2.1...v0.2.3) (2021-11-30)


### Bug Fixes

* Random ENOENT errors in `copy_file_or_directory` on Windows ([e8674fa](https://github.com/body-builder/install-local-dependencies/commit/e8674fa13f3b23c83922c7cee05f56ed07300790))
* Use POSIX path separator also in `get_target_path` ([8ef6120](https://github.com/body-builder/install-local-dependencies/commit/8ef6120e280a8a3fb3b2469ebc680bc0c25e0cc2))
* **watch-local-dependencies:** Wait with `add`/`change` events until the entire file gets written ([906c6c6](https://github.com/body-builder/install-local-dependencies/commit/906c6c6443658d5bfe54c52a0b87e462b154a893))
* Windows backslash-issue in `get_ignore_rules()` ([efb7571](https://github.com/body-builder/install-local-dependencies/commit/efb75710f4e721c35587d2bb55d919a5908ccf00))

### [0.2.2](https://github.com/body-builder/install-local-dependencies/compare/v0.2.1...v0.2.2) (2021-10-25)


### Bug Fixes

* Windows backslash-issue in `get_ignore_rules()` ([efb7571](https://github.com/body-builder/install-local-dependencies/commit/efb75710f4e721c35587d2bb55d919a5908ccf00))

### [0.2.1](https://github.com/body-builder/install-local-dependencies/compare/v0.2.0...v0.2.1) (2021-10-21)


### Bug Fixes

* Issues with ignored files in watch mode on MacOS ([d55998d](https://github.com/body-builder/install-local-dependencies/commit/d55998d13c3b3b4ea10afd4d74a3dab217b7f4fd))

## [0.2.0](https://github.com/body-builder/install-local-dependencies/compare/v0.1.1...v0.2.0) (2021-09-24)


### Features

* BREAKING CHANGE: Remove `ignored_files` from the config ([1e6dadb](https://github.com/body-builder/install-local-dependencies/commit/1e6dadba54297bf327de918755a4f3c21fe4621b))
* Use `.npmignore` or `.gitignore` as ignore pattern ([d3f87ed](https://github.com/body-builder/install-local-dependencies/commit/d3f87ed17b9ffa4841ba7fd8b04a406f2202fb61))


### Bug Fixes

* Windows backslash-issue in `get_target_path()` ([8cad12a](https://github.com/body-builder/install-local-dependencies/commit/8cad12a64f651880196582a58f7e9e9e01e26eae))

### [0.1.2](https://github.com/body-builder/install-local-dependencies/compare/v0.1.1...v0.1.2) (2021-08-26)


### Bug Fixes

* Windows backslash-issue in `get_target_path()` ([8cad12a](https://github.com/body-builder/install-local-dependencies/commit/8cad12a64f651880196582a58f7e9e9e01e26eae))

### [0.1.1](https://github.com/body-builder/install-local-dependencies/compare/v0.1.0...v0.1.1) (2021-05-20)


### Features

* Add `.DS_Store` to `ignored_files` by default ([583720d](https://github.com/body-builder/install-local-dependencies/commit/583720d665f07e9efbbb3bcccbb927a0aa9f8e00))


### Bug Fixes

* `get_file_stats()` - use `fse.lstats` instead of `fs.lstats` ([cb23c10](https://github.com/body-builder/install-local-dependencies/commit/cb23c10029749fa9432294a0a77b6a298fe958e8))

### 0.1.0 (2021-05-14)

Initial commit
