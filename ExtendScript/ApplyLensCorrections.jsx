//this script is adapted from an Adobe sample file and has not yet been cleaned up or made maintainable
//if you select images in bridge and then run this in ExtendScript with Bridge targetted, it will correct LX5 image distortion based on aspect ratio and focal length
//only the distortion slider (Camera Raw) is changed, plus cropping to the existing rectangular portion of the image
//existing crops are preserved as long as they're not in the non-image boundary
//TODO: get it to show the ACR icon in bridge, get it to show up in the Bridge menu, clean up the code and comments






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

var errors = 0;
var passes = 0;

crops = {};

crops["Barrel_LX5_10.7mm_16x9"] = {left: 0.000971, top: 0.003032}
crops["Barrel_LX5_10.7mm_1x1"]  = {left: 0.001002, top: 0.001002}
crops["Barrel_LX5_10.7mm_3x2"]  = {left: 0.001873, top: 0.004147}
crops["Barrel_LX5_10.7mm_4x3"]  = {left: 0.001451, top: 0.002562}

crops["Barrel_LX5_5.1mm_16x9"]  = {left: 0.002975, top: 0.009052}
crops["Barrel_LX5_5.1mm_1x1"]   = {left: 0.005049, top: 0.005049}
crops["Barrel_LX5_5.1mm_3x2"]   = {left: 0.004446, top: 0.009661}
crops["Barrel_LX5_5.1mm_4x3"]   = {left: 0.00517, top: 0.008975}

crops["Barrel_LX5_6.0mm_16x9"]  = {left: 0.002975, top: 0.009052}
crops["Barrel_LX5_6.0mm_1x1"]   = {left: 0.005049, top: 0.005049}
crops["Barrel_LX5_6.0mm_3x2"]   = {left: 0.003148, top: 0.006906}
crops["Barrel_LX5_6.0mm_4x3"]   = {left: 0.004416, top: 0.007692}

crops["Barrel_LX5_7.5mm_16x9"]  = {left: 0.001963, top: 0.006049}
crops["Barrel_LX5_7.5mm_1x1"]   = {left: 0.003018, top: 0.003018}
crops["Barrel_LX5_7.5mm_3x2"]   = {left: 0.003148, top: 0.006906}
crops["Barrel_LX5_7.5mm_4x3"]   = {left: 0.002922, top: 0.005126}

function ApplyLensCorrections()
{
	/**
	 The context in which this snippet can run.
	 @type String
	*/
	this.requiredContext = "\tExecute against Bridge.\nBridge must be running and \n" 
		+ "at least one thumbnail selected that is not a folder.";
	$.level = 1; // Debugging level
    app.synchronousMode = true;
    
     // Load the XMP Script library
	if( xmpLib == undefined ) 
	{
		if( Folder.fs == "Windows" )
		{
			var pathToLib = Folder.startup.fsName + "/AdobeXMPScript.dll";
		} 
		else 
		{
			var pathToLib = Folder.startup.fsName + "/AdobeXMPScript.framework";
		}
	
		var libfile = new File( pathToLib );
		var xmpLib = new ExternalObject("lib:" + pathToLib );
	}
}

function applyCameraRawPreset(thumbnail, presetName)
{
    var distortion = "";
    
    //load the distortion setting from the preset
    var file = new File("C:\\Users\\David Petrofsky\\AppData\\Roaming\\Adobe\\CameraRaw\\Settings\\" + presetName + ".xmp")
    if (file == null)
    {
        $.writeln("ERROR: Unknown preset name: " + presetName + "!")
        return;
    }
    if (!file.open("r"))
    {
        $.writeln("ERROR: Failed to open settings file " + file.path + ": " + file.error);
        return;
    }
    
    var xmp = new XMPMeta(file.read());
    distortion = xmp.getProperty("http://ns.adobe.com/camera-raw-settings/1.0/","LensManualDistortionAmount");
    file.close();
    
    if (distortion == "")
    {
         $.writeln("ERROR: No lens distortion setting found in preset " + presetName + "!")
        return;
    }
    //distortion = parseInt(distortion);
    
    //set the setting in the image
    var metadata = thumbnail.metadata;

    //modify the metadata
    var xmp = new XMPMeta(metadata.serialize());
    xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","LensManualDistortionAmount",distortion);
    xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","HasSettings",true);
    
    //crop for barrel distortion (not needed for pincushion distortion)
    if (parseInt(distortion) > 0)
    {
        var newLeft = crops[presetName].left;
        var newTop = crops[presetName].top;
        var newRight = 1-newLeft;
        var newBottom = 1-newTop;
        
        xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","HasCrop",true);
        xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","ConstrainToWarp",1);
        
        //get existing boundaries (don't want to interfere with existing crops)
        var left = parseFloat(metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropLeft"));
            if (isNaN(left))
                left = 0;
        var right = parseFloat(metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropRight"));
            if (isNaN(right))
                right = 1;
        var top = parseFloat(metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropTop"));
            if (isNaN(top))
                top = 0;
        var bottom = parseFloat(metadata.read("http://ns.adobe.com/camera-raw-settings/1.0/","CropBottom"));
            if (isNaN(bottom))
                bottom = 1;
                
        xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","CropLeft",Math.max(left,newLeft).toString());
        xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","CropRight",Math.min(right,newRight).toString());
        xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","CropTop",Math.max(top,newTop).toString());
        xmp.setProperty("http://ns.adobe.com/camera-raw-settings/1.0/","CropBottom",Math.min(bottom,newBottom).toString());
    }

    //perform the actual update
    var updatedPacket = xmp.serialize(XMPConst.SERIALIZE_OMIT_PACKET_WRAPPER | XMPConst.SERIALIZE_USE_COMPACT_FORMAT);
	thumbnail.metadata = new Metadata(updatedPacket);
    
    $.writeln("Image processed: " + thumbnail.name + "(" + presetName + ")");
    passes++;   //move 1 error into the pass column
    errors --;
}

function handleLX5Image(thumbnail,focalLength,width,height)
{
    var preset = "Barrel_LX5_";
    
    //figure out focal length part of preset name
    focalLength = focalLength.replace(/\s/g, "");
    preset += focalLength;
    preset += "_";
    
    //figure out aspect ratio part of preset name
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

    //apply the preset
    applyCameraRawPreset(thumbnail, preset);
}

/**
 Functional part of this snippet.  
 
 Gets a File object for each selected thumbnail, and uses it to
 create a BitmapData object. Uses the BitmapData object to export
 to the JPEG format.
	 @return True if the snippet ran as expected, false if no files are selected in Bridge
	 @type Boolean
*/
ApplyLensCorrections.prototype.run = function()
{
	var retval = true;
	if(!this.canRun()) {
		retval = false;	
		return retval;
	}
    
	// Get the selected Thumbnail objects - only accept these file types
	var thumbs = app.document.getSelection("dng, rw2, jpg");

	// Go through each of the selected thumbnails
	if(thumbs.length != 0)
	{
		for(var i = 0;i < thumbs.length;i++)
		{
			// get associated File object, ignore folders
			if(thumbs[i].spec instanceof File)
			{
				var thumb = thumbs[i];
                  var metadata = thumb.metadata;
                  errors++;     //mark this image as an error in case we don't finish
                  
                  //get the relevent metadata fields
                  var camera = metadata.read("http://ns.adobe.com/tiff/1.0/","Model");
                    if (camera == "")
                    {
                        $.writeln("ERROR: No camera model available for " + thumb.name + "!");
                        continue;
                    }
                  var width = metadata.read("http://ns.adobe.com/dng/1.0/","OriginalImageWidth");
                  {
                    if (width == "")
                    {
                        //width = metadata.read("http://ns.adobe.com/tiff/1.0/","ImageWidth");
                        //if (width == "")
                        //{
                            $.writeln("ERROR: No width available for " + thumb.name + "!");
                            continue;
                        //}
                    }
                  }
                  var height = metadata.read("http://ns.adobe.com/dng/1.0/","OriginalImageLength");
                  {
                    if (height == "")
                    {
                        //height = metadata.read("http://ns.adobe.com/tiff/1.0/","ImageLength");
                        //if (height == "")
                        //{
                            $.writeln("ERROR: No height available for " + thumb.name + "!");
                            continue;
                        //}
                    }
                  }
                  var focalLength = metadata.read("http://ns.adobe.com/exif/1.0/","FocalLength");
                  {
                    if (focalLength == "")
                    {
                        $.writeln("ERROR: No focal length available for " + thumb.name + "!");
                        continue;
                    }
                  }
              
                  //parse for each camera
                  if (camera == "DMC-LX5")
                    handleLX5Image(thumb,focalLength,parseInt(width),parseInt(height));
                  else
                    $.writeln("ERROR: Unknown camera " + camera + " for " + thumb.name + "!");
			}
		}
	}
	else
	{
		retval = false;
	}
	
    $.writeln("Errors: " + errors);
    $.writeln("Passes: " + passes);
    
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
ApplyLensCorrections.prototype.canRun = function()
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
if(typeof(ApplyLensCorrections_unitTest)  == "undefined") {
    new ApplyLensCorrections().run();
}

