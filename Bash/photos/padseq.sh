# Takes 4-digit iphone format photo and padds to 5-digits.
# Always adds 0 for 5+ left digit and 1 for 4- left digit.
# It does it this way so that it can handle folders where
# the sequnece resets.
# It is recursive, but you can just run it in the folder you want.

ALL_FILES=$(find "$1" -type 'f' -iname 'IMG_[0-9][0-9][0-9][0-9].*' && find "$1" -type 'f' -iname 'IMG_[0-9][0-9][0-9][0-9]_edited.*')

while read -r IMAGE_FILE
do
  IMAGE_FOLDER=$(dirname "$IMAGE_FILE")
  ORIGINAL_NAME=$(basename "$IMAGE_FILE")
  SEQ=$(echo "$ORIGINAL_NAME" | cut -c 5)

  if [ $SEQ -lt 5 ]
  then
    NEW_SEQ=1
  else
    NEW_SEQ=0
  fi

  NEW_IMAGE_NAME=$(echo "$ORIGINAL_NAME" | sed "s/IMG_/IMG_$NEW_SEQ/")
  NEW_IMAGE_FILE="$IMAGE_FOLDER"/"$NEW_IMAGE_NAME"

  echo "Renaming $IMAGE_FILE to $NEW_IMAGE_FILE"
  mv "$IMAGE_FILE" "$NEW_IMAGE_FILE"
done <<< "$ALL_FILES"

