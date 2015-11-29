use strict;
use warnings;
use feature "say";

$|=1;

## AddFigures [file]
sub main {   
  my $filename = shift;
  
  open(INPUT, $filename) or die("Could not open file: $!\n");
  my $sum = 0;
  while (<INPUT>) {
    if (/(\+|-)\$(\d+\.?\d*)/) {
      my $operation = $1;
      my $number = $2;
      
      if ($operation eq '+') {
        $sum += $number;
      }
      else {
        $sum -= $number;
      }
    }
  }
  say -$sum;
  close(INPUT);
}

main(@ARGV);
