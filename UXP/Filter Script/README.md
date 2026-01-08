# Introduction

This (in progress) plugin is for writing per-pixel scripts to process or generate images. Inspired by shaders, the idea is to be able to mathematically describe images I want to create.

## Getting Started

Make sure Photoshop is up and running first. First, add the plugin to the "Developer Workspace" in the UXP Developer Tools (UDT) application.
  * Click "Add Plugin" and select the `manifest.json` file in this folder folder.

Click the ••• button next to the corresponding workspace entry, and click "Load". Switch over to Photoshop, and the plugin's panel will be running. 

## Status

Currently, it will do the following on `Apply` button:
1. If no layer is selected, make a new empty layer and select it.
1. If a layer is selected, and `Create New Layer` is checked, the layer is copied and selected.
1. If a layer is selected, and `Create New Layer` is unchecked, do nothing and move on.
1. Show the layer name and type for selected layer (after the above steps), plus document dimensions, color moade, and bith depth.

## TBD

1. Deal with masks, clipping masks, and selections?
1. Why does button not disable during processing?
1. Fix icons issue in manifest.json.
1. Split `utils.js`.
1. Do not export helpers that are not used outside the files themselves.
1. Remove any unused code paths.
