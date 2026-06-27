# Extract Motion Plugin

This plugin extracts scale, position, and anchor point from the Motion effect on selected image clip(s) and migrates them into a new Transform effect.

The transform effect is set with a default shutter angle of 360 degrees as a starting point.

It can also optionally add default Ken Burns style scale keyframes (set at the same value).

## Load into Premiere Pro

Make sure Premiere Pro is up and running first. First, add the plugin to the "Developer Workspace" in the UXP Developer Tools (UDT) application.

- If you selected "Create Plugin..." earlier, it will have already be there with the plugin ID and name you specified.
- Otherwise, click "Add Plugin" and select the `manifest.json` file in the corresponding plugin folder.

Click "Load" in the corresponding workspace entry. Switch over to Premiere Pro, and the plugin's panel will be showing. Also find it in the Window > UXP Plugins menu.

## Status

This plug is not working despite many hours of debugging and vibe coding. It seems the UXP API is not stable enough. It refuses to set keyframe values on the Transform effect, and the values are not being read correctly from the Motion effect either. I have no idea why. I will keep trying to figure it out, but for now this is a non-functional prototype.

In addition, I haven't yet tested multiple selected clips, and also I don't like how it uses multiple undo actions in the history instead of 1.
