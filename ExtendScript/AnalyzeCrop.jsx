/** 
  @fileoverview Shows how to save multiple files as JPEG images using BitmapData.
  @class Shows how to save multiple files as JPEG images using BitmapData.
 
   <h4>Usage</h4>
   
   <ol>
   <li>Open the snippet in the ExtendScript Toolkit (see Readme.txt), setting Bridge CS6 as the target application.
   <li> In Bridge, select at least one thumbnail representing an image file, and run the snippet.
   <li>Once you have executed the snippet, you should find JPEG images created from each thumbnail you selected. 
   </ol>


 
   <h4>Description</h4>
  
   <p>Shows how to save files as JPEG images, using the BitmapData
   object and the ExtendScript File object for a thumbnail.
   You can select one or multiple thumbnails for the image files to save.
   The script ignores any selected folders, and overwrites any
   existing files.<br /> 

  @constructor Constructor  
 */

uniqueCrops = {};

function AnalyzeCrop()
{
	/**
	 The context in which this snippet can run.
	 @type String
	*/
	this.requiredContext = "\tExecute against Bridge.\nBridge must be running and \n" 
		+ "at least one thumbnail selected that is not a folder.";
	$.level = 1; // Debugging level
    app.synchronousMode = true;
}

function getPresetName(thumbnail)
{
    var preset = "Barrel_LX5_";
    var metadata = thumbnail.metadata;
    
    //figure out focal length part of preset name
    var focalLength = metadata.read("http://ns.adobe.com/exif/1.0/","FocalLength");
    focalLength = focalLength.replace(/\s/g, "");
    preset += focalLength;
    preset += "_";
    
    //figure out aspect ratio part of preset name
    var width = metadata.read("http://ns.adobe.com/dng/1.0/","OriginalImageWidth");
    var height = metadata.read("http://ns.adobe.com/dng/1.0/","OriginalImageLength");
    
    if (height > width)
    {
        temp = width;
        width = height;
        height = temp;
    }
    if (width == 2736)
    {
        if (height != 2736)
        {
            $.writeln("ERROR: Unknown aspect ratio for " + thumbnail.name + "!");
            return;
        }
    
        preset += "1x1";
    }
    else if (width == 3776)
    {
         if (height != 2520)
        {
            $.writeln("ERROR: Unknown aspect ratio for " + thumbnail.name + "!");
            return;
        }
    
        preset += "3x2";
    }
    else if (width == 3968)
    {
         if (height != 2232)
        {
            $.writeln("ERROR: Unknown aspect ratio for " + thumbnail.name + "!");
            return;
        }
    
        preset += "16x9";
    }
    else if (width = 3648)
    {
        if (height != 2736)
        {
            $.writeln("ERROR: Unknown aspect ratio for " + thumbnail.name + "!");
            return;
        }
    
        preset += "4x3";
    }
    else
    {
        $.writeln("ERROR: Unknown aspect ratio for " + thumbnail.name + "!");
        return;
    }
        
    return preset;
}

function getCropInformation(thumbnail)
{
    var preset = getPresetName(thumbnail);
    var cropLeft = thumbnail.metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropLeft");
    var cropRight = thumbnail.metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropRight");
    var cropTop = thumbnail.metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropTop");
    var cropBottom = thumbnail.metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropBottom");
    var hasCrop = thumbnail.metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","HasCrop");
    var distortion = parseInt(thumbnail.metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","LensManualDistortionAmount"));
    
     if ((hasCrop == "true" || hasCrop == "True") && distortion > 0)
        uniqueCrops[preset] = {left: cropLeft, right: cropRight, top: cropTop, bottom: cropBottom}
}

/**
 Functional part of this snippet.  
 
 Gets a File object for each selected thumbnail, and uses it to
 create a BitmapData object. Uses the BitmapData object to export
 to the JPEG format.
	 @return True if the snippet ran as expected, false if no files are selected in Bridge
	 @type Boolean
*/
DumpMetadata.prototype.run = function()
{
	var retval = true;
	if(!this.canRun()) {
		retval = false;	
		return retval;
	}
    
	// Get the selected Thumbnail objects - only accept these file types
	var thumbs = app.document.getSelection("dng, rw2, jpg, tiff, psd");

	// Go through each of the selected thumbnails
	if(thumbs.length != 0)
	{
		for(var i = 0;i < thumbs.length;i++)
		{
			// get associated File object, ignore folders
			if(thumbs[i].spec instanceof File)
			{
				getCropInformation(thumbs[i]);
			}
		}
	}
	else
	{
		retval = false;
	}
    
    var keyList = new Array();
    for (var key in uniqueCrops)
        keyList.push(key);
    keyList.sort();
    
    for (var i = 0; i < keyList.length; i++)
    {
            var key = keyList[i];
            var out = "crops[\"" + key + "\"] = {";
            var item = uniqueCrops[key];
            
            out += "left: " + item.left + ", ";
            //out += "right: " + item.right + ",";
            out += "top: " + item.top/* + ","*/;
            //out += "bottom: " + item.bottom;
            
            out += "}";
            
            $.writeln(out);
    }
        
	return retval;
}

/**
 Determines whether snippet can be run given current context.  The snippet will
 fail if these preconditions are not met: 
 <ul>
 <li> Must in Bridge
 <li> At least one file must be selected in Bridge
 </ul>

 @return True if this snippet can run, false otherwise
 @type boolean
*/
DumpMetadata.prototype.canRun = function()
{	
	
	// must run in Bridge 
	// must be at least one selection. 
	if((BridgeTalk.appName == "bridge") && (app.document.selectionLength > 0)) 
	{
		return true;
	}
	// Fail if these preconditions are not met.  
	$.writeln("ERROR: ERROR:: Cannot run ApplyLensCorrections");
	$.writeln(this.requiredContext);
	return false;
}

/**
 "main program": construct an anonymous instance and run it
  as long as we are not unit-testing this snippet.
*/
if(typeof(DumpMetadata_unitTest)  == "undefined") {
    new DumpMetadata().run();
}

