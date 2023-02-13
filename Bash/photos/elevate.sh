# Processes year folder -> brings up project subfolders of month folders to top level of year with earliest date and project name.
# elevate [yearFolder]

YEAR_FOLDER="$1"

for MONTH_FOLDER in "$1"/*
do
  echo "Processing month $MONTH_FOLDER"
  MONTH_NAME=$(basename "$MONTH_FOLDER")

  for PROJECT_FOLDER in "$MONTH_FOLDER"/*
  do
    echo "Processing project $PROJECT_FOLDER"

    EARLIEST_DATE='_'
    for IMAGE_FILE in "$PROJECT_FOLDER"/*.*
    do
      echo "Processing image $IMAGE_FILE"
      IMAGE_DATE=$(~/repos/scripts/Bash/photos/friendlydate.sh "$IMAGE_FILE")
      IMAGE_MONTH=$(echo "$IMAGE_DATE" | cut -d '_' -f 1-2)

      if [ "$IMAGE_MONTH" != "$MONTH_NAME" ]
      then
        echo "WARNING: Outlier: $IMAGE_FILE"
      else
         if [[ "$IMAGE_DATE" < "$EARLIEST_DATE" ]]
         then
           EARLIEST_DATE="$IMAGE_DATE"
           echo "Switching earliest date!"
         fi
      fi
    done

    echo "Earliest date: $EARLIEST_DATE"
    COMPRESSED_TIMESTAMP=$(echo "$EARLIEST_DATE" | sed 's/_//g')
    OUTPUT_FOLDER="$YEAR_FOLDER/$COMPRESSED_TIMESTAMP"_$(basename "$PROJECT_FOLDER")

    echo "Output folder: $OUTPUT_FOLDER"
    mv "$PROJECT_FOLDER" "$OUTPUT_FOLDER"
  done
done

