# Finds AAE files that aren't next to their images.
# orphanededits [root]
# Assumes whole path has no spaces.

AAE_FILES=$(find "$1" -type f -iname '*.aae' -print)

for aae_file in $AAE_FILES
do
  BASE_FOR_AAE1=$(echo "$aae_file" | rev | cut -d . -f 2 | rev)
  BASE_FOR_AAE2=$(echo "$aae_file" | rev | cut -d . -f 2 | cut -d O -f 2 | rev)

  MATCHING_FILES_FOR_1=$(ls -1 $BASE_FOR_AAE1.* 2>/dev/null)
  MATCHING_FILES_FOR_2=$(ls -1 $BASE_FOR_AAE2.* 2>/dev/null)
 
  NUM_FILES_FOR_1=$(echo "$MATCHING_FILES_FOR_1" | wc -l)
  NUM_FILES_FOR_2=$(echo "$MATCHING_FILES_FOR_2" | wc -l)

  EXTRA_FILE_IN_1=0
  EXTRA_FILE_IN_2=0

  if [ "$MATCHING_FILES_FOR_1" != "$aae_file" ] && [ -n "$MATCHING_FILES_FOR_1" ]
  then
    EXTRA_FILE_IN_1=1
  fi
  if [ "$MATCHING_FILES_FOR_2" != "$aae_file" ] && [ -n "$MATCHING_FILES_FOR_2" ]
  then
    EXTRA_FILE_IN_2=1
  fi

  if [ $EXTRA_FILE_IN_1 -eq 0 ] && [ $EXTRA_FILE_IN_2 -eq 0 ]
  then
    echo "$aae_file"
  fi
done

