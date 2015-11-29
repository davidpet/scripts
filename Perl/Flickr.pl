use strict;
use warnings;

use feature "say";
use WebGrep;
$|=1;

##flickr.pl [url] [filenameWithoutExtension]
##flickr.pl [urllistfile] [base filenameWithoutExtension]
###creates high-res (may not exist) and normal file

sub downloadFromFlickr {
  my $url = shift;
  my $outputFile = shift;
   
  my @matches = WebGrep::WebGrep($url, 'link', 'href', 'href', '_m\.jpg');
  my $firstmatch = $matches[0];
  say "transforming $firstmatch";
  $firstmatch =~ s/(_)(m)(\.jpg)/${1}b${3}/;
  #my $highmatch = ($firstmatch =~ s/(_)(b)(\.jpg)/${1}h${3}/r);
  say "transformed: $firstmatch";
  #say "high-res: $highmatch";
  
  #my $retcode = getstore($highmatch, $outputFile."_h.jpg");
  #say "High: $retcode";
  my $retcode = getstore($firstmatch, $outputFile."_b.jpg");
  say "Normal: $retcode";
  
  say "Writing to: $outputFile";
}

sub main {
  my $filelist = shift;
  my $outputBase = shift;
  
  if (-f $filelist) {
    open(INPUT, $filelist) or die("Could not open file: $!\n");
    my $count = 0;
    while (<INPUT>) {
      chomp;
      say "Processing $_";
      downloadFromFlickr($_, $outputBase."_".$count);
      ++$count;
    }
    close(INPUT);
  }
  else {
    downloadFromFlickr($filelist, $outputBase);
  }
}

main(@ARGV);