# Gets photograph workflow friendly date stamp of the file based on taken date.

~/repos/scripts/Bash/photos/taken.sh "$1" | cut -d ' ' -f 1 | tr ':' '_'

