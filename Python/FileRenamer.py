#This script was created in a rush after years of not using Python -> obviously it needs some cleanup
import sys, os

# FileRenamer [text file] [folder]
# lines in the text file become filenames in the order they come back from the OS in folder (extension maintained)
# use in conjunction with an automatic ID3 tag syncing program to set track names and titles of mp3 files from a text file 

if (len(sys.argv)) != 3:
  print("Wrong number of arguments!")
  exit(1)

textFile = sys.argv[1]
folder = sys.argv[2]

newfilenames = []

for line in open(textFile):
  line = line.strip()
  if line: newfilenames.append(line)

oldfilenames = os.listdir(folder)

if len(oldfilenames) != len(newfilenames):
  print("Mismatching number of files!")
  exit(2)

for i in range(len(oldfilenames)):
  oldfilename, oldfileextension = os.path.splitext(oldfilenames[i])
  newfilename = newfilenames[i] +  oldfileextension
  print 'Renaming "%s" to "%s"!' % (oldfilename, newfilename)
  os.rename(os.path.join(folder, oldfilename + oldfileextension), os.path.join(folder, newfilename))

