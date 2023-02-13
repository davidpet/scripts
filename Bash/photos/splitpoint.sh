PHOTO_FOLDER="$1"

ALL_FILES=$(find "$PHOTO_FOLDER" -type 'f')

PREVIOUS_SEQ=
while readline -r NEXT_FILE
do
  echo "$NEXT_FILE"
  SEQ=$(echo "$NEXT_FILE" | basename | sed 's/IMG_//' | rev | cut -d '.' -f 2- | rev | cut -d '_' -f 1)

done <<< "$ALL_FILES"

