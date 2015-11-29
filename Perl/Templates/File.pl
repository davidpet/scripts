use strict;
use warnings;
use feature "say";

$|=1;

sub main {   
  my $filename = shift;
  
  open(INPUT, $filename) or die("Could not open file: $!\n");
  while (<INPUT>) {
    #do stuff with $_ here
  }
  close(INPUT);
}

main(@ARGV);
