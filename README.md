# Install local dependencies

[![npm version](https://badge.fury.io/js/install-local-dependencies.svg)](http://badge.fury.io/js/install-local-dependencies)
[![dependencies Status](https://david-dm.org/body-builder/install-local-dependencies/status.svg)](https://david-dm.org/body-builder/install-local-dependencies)
[![devDependencies Status](https://david-dm.org/body-builder/install-local-dependencies/dev-status.svg)](https://david-dm.org/body-builder/install-local-dependencies?type=dev)
[![peerDependencies Status](https://david-dm.org/body-builder/install-local-dependencies/peer-status.svg)](https://david-dm.org/body-builder/install-local-dependencies?type=peer)

Yet another local dependency installer (and watcher). Works with NPM, Yarn and PNPM.

`install-local-dependencies` checks your **package.json** and installs the listed local packages as they were installed from `npm`. This helps you to get a production-like installation of your locally developed package, without all the issues of symlinked packages (`npm link`), invalid peerDependencies, or different dependency instances in the project, and the development package (eg. React's Invalid Hook Call warnings).

## Installation

`$ npm install install-local-dependencies -g`

## Usage

Instead of `$ (npm|yarn|pnpm) install`, install your project dependencies with `$ install-local-dependencies`. It will check the local dependencies listed in your **package.json**, and install all of your project's dependencies, not only the local ones.

Once all is installed, you can continue developing your local package, the `watch-local-dependencies` script will watch and immediately copy the changed files to the **node_modules** folder.

## CLI

```shell
# Install
$ install-local-dependencies

# Watcher
$ watch-local-dependencies
```

## Example

package.json
```json5
{
  //...
  "dependencies": {
    "my-awesome-package": "file:../package-folder",
  },
  //...
}
```

# Configuration
.localdependenciesrc
```json5
{
  "manager": "npm", // the package manager you are using for installing the packages (example: "npm" or "yarn" or "pnpm")
  "modules_dir": "node_modules", 
  "install_args": "", // extra arguments for the internal npm/yarn/pnpm install command (example: "--legacy-peer-deps")
  "types": ["dependencies"], // dependency types you want to handle with `install-local-dependencies` (these packages will also get installed, but in the regular way) (defaults to ["dependencies", "devDependencies"])
  "ignored_files": ["**/an_ignored_file.ext"], // files not to include to the installed package (defaults to ["package.json", "node_modules"])
  "ignored_packages": [], // list of local packages you don't want to handle with `install-local-dependencies` (these packages will also get installed, but in the regular way)
}
```

----

Sponsored by: [SRG Group Kft.](https://srg.hu?en)
