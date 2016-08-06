#This script was created in a rush after years of not using Python -> obviously it needs some cleanup
import sys, os

# FileRenamer [text file] [folder] [optional: # items to skip]
# lines in the text file become filenames in the order they come back from the OS in folder (extension maintained)
# use in conjunction with an automatic ID3 tag syncing program to set track names and titles of mp3 files from a text file 
# the skip option is in case you processed several files and then saw an error and want to try again from that point

if len(sys.argv) < 3 or len(sys.argv) > 4:
  print("Wrong number of arguments!")
  exit(1)

textFile = sys.argv[1]
folder = sys.argv[2]
if len(sys.argv) == 4:
  skip = int(sys.argv[3])
else:
  skip = 0

newfilenames = []

for line in open(textFile):
  line = line.strip()
  if line: newfilenames.append(line)

oldfilenames = os.listdir(folder)

if len(oldfilenames) != len(newfilenames):
  print("Mismatching number of files!")
  exit(2)

oldfilenames = oldfilenames[skip:]
newfilenames = newfilenames[skip:]

for i in range(len(oldfilenames)):
  oldfilename, oldfileextension = os.path.splitext(oldfilenames[i])
  newfilename = newfilenames[i] +  oldfileextension
  print 'Renaming "%s" to "%s"!' % (oldfilename, newfilename)
  os.rename(os.path.join(folder, oldfilename + oldfileextension), os.path.join(folder, newfilename))

