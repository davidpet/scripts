use strict;
use warnings;
use feature "say";

use LWP::Simple;
use Data::Dumper;

$|=1;

###WebGrep [url] [tag] [attributeToReturn or * for whole tag] [field1] [regex1] ...
###this is a modulino (will print its matches if executed standalone or return them as list of strings if called from elsewhere)
##todo: make this more generally useful (maybe change to a webscraper interface)

package WebGrep;
__PACKAGE__->main( @ARGV ) unless caller();

sub getCriteria {
  my %ret = ();
  
  my $numArgs = scalar(@_);
  if (@_ && $numArgs > 0) {
    for (my $i = 0; $i < $numArgs; $i += 2) {
      my $key = shift;
      my $value = shift;
      if (defined $value) {
        $ret{$key} = $value; 
      }
    }
  }
  
  return \%ret;
}

sub getMatches {
  my ($url, $tag, $criteria_ref) = @_;
  
  my @output = ();
  my $webpage = LWP::Simple::get($url) or die("Failure reading web page!\n");
  my @possibleMatches = $webpage =~ /<$tag.*?>/ig;
  foreach my $match(@possibleMatches) {
    my $isMatch = 1;
    foreach my $key(keys %$criteria_ref) {
      if ($match !~ / $key="(.*?)"/ig) {
        $isMatch = 0;
        last;
      }
      if ($1 !~ $criteria_ref->{$key}) { 
        $isMatch = 0;
        last;
      }
    }
    if ($isMatch) {
      push(@output, $match);
    }
  }
  
  return @output;
}

sub WebGrep {   
  my $url = shift;
  my $tag = shift;
  if (not defined $tag) {
    $tag = 'img';
  }
  my $capture = shift;
  if (not defined $capture) {
    $capture = 'src';
  }
  my $criteria_ref = getCriteria(@_);
  
  my @matches = getMatches($url, $tag, $criteria_ref);
  if ($capture ne "*") {
    @matches = map {s/.* $capture="(.*?)".*/$1/igr} @matches;
  }
  
  return @matches;
}

sub main {
  my @matches = WebGrep(@ARGV);
  local $" = "\n";
  say "@matches";
}

##do I need 1 here?

__END__
