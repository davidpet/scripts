# List all files in the given folder recursively by full path, one per line.
# Does not deal with hidden things at this time.

# NOTE: this is almost the same as just doing 'find [folder]' but it ommits
# the folders themselves as items.
# NOTE: it is actually the same thing as 'find [folder] -type f'

function find-files {
  local CURRENT_FOLDER="$1"
  for CHILD_ITEM in "$CURRENT_FOLDER"/*
  do
    if [ -f "$CHILD_ITEM" ]
    then
      echo "$CHILD_ITEM"
    else
      find-files "$CHILD_ITEM"
    fi
  done
}

find-files "$1"

