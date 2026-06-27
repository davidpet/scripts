# Introduction

This (in progress) plugin is for writing per-pixel scripts to process or generate images. Inspired by shaders, the idea is to be able to mathematically describe images I want to create.

## Getting Started

Make sure Photoshop is up and running first. First, add the plugin to the "Developer Workspace" in the UXP Developer Tools (UDT) application.

- Click "Add Plugin" and select the `manifest.json` file in this folder folder.

Click the ••• button next to the corresponding workspace entry, and click "Load". Switch over to Photoshop, and the plugin's panel will be running.

## Status

Currently, it will do the following on `Apply` button:

1. If no layer is selected, make a new empty layer and select it.
1. If a layer is selected, and `Create New Layer` is checked, the layer is copied and selected.
1. If a layer is selected, and `Create New Layer` is unchecked, do nothing and move on.
1. Run the script in the text box on the selected layer, per pixel (see reference sections for variables you can use).
   - The variables depend on the document's color space, bit depth, and dimensions.
   - Only RGB, LAB, and Grayscale modes are supported for now.

In progress commit: the editing and filtering w/ variables (stuck on getting scrollbar to work - broke the whole text box by trying to do custom scrollbars because UXP doesn't seem to let you scroll)
   * also haven't tested the actual script execution yet (need to test on new and existing layers, different sizes, color modes, etc.)(have been focusing on serious UI issues first)
   * test console logging, performance, status/progress, undo, accuracy, etc.

## ToDo

1. `mode` variable in scripts ( to allow writing multi-mode scripts)
1. save/load button and script folder persistence
1. default/built-in scripts
1. importing of other scripts w/ scoping (maybe a require-like function) (library root)
1. test pattern and LUT generation steps like in live-tools here too (instead of)
1. Why can't all text be copied/pasted in a panel?
1. Copy/Paste/Clear buttons?  (not priority because ctrl-a, ctrl-c, ctrl-v and delete all work)
1. Deal with masks, clipping masks, and selections?
1. Allow for color space conversions and/or different working space at the script level?
1. Why does button not disable during processing?
1. Fix icons issue in manifest.json.
1. Split `utils.js`.
1. Remove any unused code paths (here and in Layer Info plugin too).
