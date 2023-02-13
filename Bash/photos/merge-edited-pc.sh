# Renames the E* files to _edited files in a PC iPhone import.
# Also sanity checks that there are originals & AAEs next to the file
# and tries to find other files you might want to look into.
# You may get a false warning if the edited file and original have
# different extensions.

ROOT_FOLDER="$1"
EDITED_FILES=$(find "$ROOT_FOLDER" -type 'f' -iname 'IMG_E[0-9][0-9][0-9][0-9].*')

while read -r EDITED_FILE
do
  NEW_NAME=$(echo "$EDITED_FILE" | rev | sed 's/E//I' | sed 's/\./.detide_/' | rev)
  echo "Renaming $EDITED_FILE to $NEW_NAME"
  mv "$EDITED_FILE" "$NEW_NAME"

  UNEDITED_NAME=$(echo "$NEW_NAME" | rev | sed 's/detide_//' | rev)
  if ! [ -f "$UNEDITED_NAME" ]
  then
    echo "WARNING: no original for $NEW_NAME"
  fi

  BASE_NAME=$(echo "$UNEDITED_NAME" | rev | cut -d '.' -f 2- | rev)
  if ! [ -f "$BASE_NAME.AAE" ] && ! [ -f "$BASE_NAME.aae" ]
  then
    echo "WARNING: no AAE for $NEW_NAME"
  fi
done <<< "$EDITED_FILES"

echo "//////////////////////////////////////////"
echo "Other possible edits to check manually:"
echo "//////////////////////////////////////////"
find "$ROOT_FOLDER" -type 'f' -iname '*E[0-9][0-9][0-9][0-9].*'

