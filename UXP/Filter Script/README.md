# Introduction

This (in progress) plugin is for writing per-pixel scripts to process or generate images. Inspired by shaders, the idea is to be able to mathematically describe images I want to create.

## Getting Started

Make sure Photoshop is up and running first. First, add the plugin to the "Developer Workspace" in the UXP Developer Tools (UDT) application.
  * Click "Add Plugin" and select the `manifest.json` file in this folder folder.

Click the ••• button next to the corresponding workspace entry, and click "Load". Switch over to Photoshop, and the plugin's panel will be running. 

## Status

It will currently show the layer name and type, plus the document dimensions, color mode, and bit depth.

## TBD

1. Why does button not disable during processing?
1. Fix icons issue in manifest.json.
1. Do not export helpers that are not used outside the files themselves.
