# merge-edits-mac [originals] [modified]
# Assumes no spaces in paths
# Also for now, don't have any other regex chars like / in path (will fix later).
# Uses .AAE files to know which files have modified versions and then brings all
# possible ones over.
# This is necessary on Mac version because Mac outputs all files again even if
# none were edited.

AAE_FILES=$(find "$1" -iname "*.aae")

for aae_file in $AAE_FILES
do
  EDIT_BASE=$(echo "$aae_file" | sed "s/$1/$2/" | rev | cut -d '.' -f 2- | rev)
  for edited_file in $EDIT_BASE.*
  do
    if [ -f "$edited_file" ]
    then
      TARGET_FOLDER=$(dirname "$aae_file")
      TARGET_NAME=$(basename "$aae_file" | rev | cut -d '.' -f 2- | rev)
      TARGET_EXTENSION=$(echo "$edited_file" | rev | cut -d '.' -f 1 | rev) 
      TARGET_PATH="$TARGET_FOLDER/$TARGET_NAME""_edited.""$TARGET_EXTENSION"

      echo "Moving '$edited_file' to '$TARGET_PATH'"
      mv "$edited_file" "$TARGET_PATH"
    else
      echo "ERROR: Missing file '$edited_file'"
    fi
  done
done

