//this script is adapted from an Adobe sample and needs to be cleaned up and commented correctly (old comments are still here)
//if you have images selected in bridge and run this from ExtendScript, it will dump the XMP metadata of the images to the JavaScript console

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

function DumpMetadata()
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

function dumpMetadata(thumbnail)
{
    //set the setting in the image
    var metadata = thumbnail.metadata;
    $.writeln(metadata.serialize());
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
				dumpMetadata(thumbs[i]);
			}
		}
	}
	else
	{
		retval = false;
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

