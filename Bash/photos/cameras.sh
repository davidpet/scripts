ALL_FILES=$(find "$1" -type f)

while read -r IMAGE_FILE
do
  IMAGE_CAMERA=$(~/repos/scripts/Bash/photos/cleantag.sh Model "$IMAGE_FILE")
  echo "'$IMAGE_CAMERA' '$IMAGE_FILE'" 
done <<< "$ALL_FILES"

