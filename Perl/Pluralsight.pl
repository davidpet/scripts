use strict;
use warnings;
use feature "say";
use LWP::Simple;
$|=1;

#1. Open the tutorial page with all video links visible. (do the rest of the steps fast before connections/credentials start closing and giving 403)
#2. Open and save the source from the browser as a local file (copy into notepad so you don't lose line endings).
#3. Invoke this script with that file as an argument and pipe output to another text file.
#4. Copy the contents of that file to the clipboard and open as tabs in browser.
#5. Go to each tab (discarding duplicates), start playing video, do Inspect Element on video, expand the div, middle-click the mp4 link, and close that tab.
#6. When left with the right amount of pure mp4 tabs, copy all links and paste to a text file (make sure tabs are in correct order).
#7. On the tutorial page, copy the table of contents html and reformat it in a text file so that module names comes before chapter names and modules are separated by extra newlines. (change illegal chars)
#8. Invoke the script again with toc, videos, and output folder to download all the videos with names based on the TOC.
#9. If any didn't return 200, manually do those.
#10. Manually download the exercise files.
#11. To be able to play back double speed, use windows media player (Enhancements -> Play Speed Settings).

##TODO: make this more automatic (let Perl interact with the browser to save a crapload of time - have to figure out ajax and authentication stuff first)
sub getVideoLinks {
  my $listfile = shift;
  
  open(INPUT, $listfile) or die("Could not open list file: $!\n");
  while (<INPUT>) {
    if (/launchPlayerWindow\('(.*?)',\s*'(.*?)'\)/) {
      my $rootPath = $1;
      my $options = ($2 =~ s/&amp;/&/gr);
      my $videourl = $rootPath."/Player?".$options;
      
      say $videourl;
    }
  }
  close(INPUT);
}

sub processModule {
  my $moduleText = shift;
  my $videos_ref = shift;
  my $outputFolder  = shift;
  my $moduleNumber = shift;
  
  my @lines = split("\n", $moduleText);
  my $moduleName = shift(@lines);
  my $moduleFolder = "$outputFolder/$moduleNumber - $moduleName";
  
  `mkdir "$moduleFolder"`;
  my $count = 0;
  for my $line(@lines) {
    if ($line ne "") {
      say $line;
      my $videolink = shift(@$videos_ref);
      my $filename = "$moduleFolder/".(++$count)." - $line.mp4";
      say getstore($videolink, $filename);
    }
  }
}

sub getVideoModules {
  my $toc = shift;
  my $videos = shift;
  my $outputFolder = shift;
  
  my @videos = ();
  my @modules = ();
  
  open(VIDEOS, $videos) or die("Could not open videos file: $!\n");
  while (<VIDEOS>) {
    chomp;
    push(@videos, $_);
  }
  close(VIDEOS);
  
  open(TOC, $toc) or die("Could not open toc file: $!\n");
  local $/ = "";
  while (<TOC>) {
    push(@modules, $_);
  }
  close(TOC);
  
  my $count = 0;
  for my $module(@modules) {
    processModule($module, \@videos, $outputFolder, ++$count);
  }
}

sub main {
  if (scalar(@_) < 2) {
    getVideoLinks(@_);
  }
  else {
    getVideoModules(@_);
  }
}

main(@ARGV);