# Introduction

This PS plugin gets selected layer and document info. It is a more useful template to start from than the included print all layers one.

## Using as template

1. Duplicate the folder
1. Change `name`, `id`, and `label.default` in `manifest.json`
1. Change `README.md` and `package.json` as appropriate

## Getting Started

Make sure Photoshop is up and running first. First, add the plugin to the "Developer Workspace" in the UXP Developer Tools (UDT) application.
  * Click "Add Plugin" and select the `manifest.json` file in this folder folder.

Click the ••• button next to the corresponding workspace entry, and click "Load". Switch over to Photoshop, and the plugin's panel will be running. 

## TBD

1. Why does button not disable during processing?
1. Fix icons issue in manifest.json.
1. Do not export helpers that are not used outside the files themselves.
