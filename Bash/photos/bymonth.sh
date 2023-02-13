CATALOG="$1"
HASHES="$2"
OUTPUTROOT="$3"

if [ -d "$OUTPUTROOT" ]
then
  echo 'Error: output exists!'
  exit 1
fi

echo "Creating directory $OUTPUTROOT"
mkdir --parents "$OUTPUTROOT"
if [ ! -d "$OUTPUTROOT" ]
then
  exit 1
fi

echo "Scanning files"
HASH_LIST=$(cat "$HASHES")
HASH_COUNT=$(wc -l "$HASHES" | cut -d ' ' -f 1)
FAVORITES=0
HASHES_DONE=0
LAST_PERCENTAGE=0
for hash in $HASH_LIST
do
  # echo "Processing $hash"
  FILE_LIST=$(~/repos/scripts/Bash/photos/lookup.sh "$hash" "$CATALOG")
  FILE_BASENAME=""
  FILE_ORIGINAL=""
  FILE_EXTENSION=""
  IS_FAVORITE=0
  while read dupefile
  do
    # echo "File $dupefile"
    if [ -z "$FILE_BASENAME" ]
    then
      FILE_BASENAME=$(~/repos/scripts/Bash/photos/basename.sh "$dupefile")
      FILE_ORIGINAL="$dupefile"
      # echo "Basename $FILE_BASENAME"
    else
      IS_FAVORITE=1
      echo "Favorited: $hash"
    fi
  done <<< "$FILE_LIST"

  if [ -z "$FILE_BASENAME" ]
  then
    echo "WARNING: no file for hash: $hash"
  else
    MONTH_STAMP=$(~/repos/scripts/Bash/photos/friendlydate.sh "$FILE_ORIGINAL" | rev | cut -d '_' -f 2- | rev)
    YEAR_STAMP=$(echo "$MONTH_STAMP" | cut -d '_' -f 1) 
    FOLDER_NEW="$OUTPUTROOT/$YEAR_STAMP/$MONTH_STAMP"

    # echo "Creating (or using) $FOLDER_NEW"
    mkdir --parents "$FOLDER_NEW"

    FILE_NEW="$FOLDER_NEW/$FILE_BASENAME"

    # echo "Moving '$FILE_ORIGINAL to $FILE_NEW"
    if [ -f "$FILE_NEW" ]
    then
      echo "WARNING: file already exists $FILE_NEW"
    else
      if [ $IS_FAVORITE -eq 1 ]
      then
        # echo "Moving as favorite"
        let FAVORITES=FAVORITES+1
        exiftool -Rating=1 -o "$FILE_NEW" "$FILE_ORIGINAL"
      else
        mv "$FILE_ORIGINAL" "$FILE_NEW"
      fi
    fi
  fi
# echo "Hashes done (old): $HASHES_DONE"
let HASHES_DONE=HASHES_DONE+1
# echo "Hashes done (new): $HASHES_DONE"
# echo "Total Hashes: $HASH_COUNT"
PERCENT_DONE=$(( HASHES_DONE * 100 / HASH_COUNT ))
PERCENT_DONE_ONES=$(( PERCENT_DONE % 10 ))
# echo "Percent Done: $PERCENT_DONE"
#echo "$Percent Ones: $PERCENT_DONE_ONES"
if [ $PERCENT_DONE_ONES -eq 0 ]
then
  if [ $PERCENT_DONE -gt $LAST_PERCENTAGE ]
  then
    LAST_PERCENTAGE=$PERCENT_DONE
    echo "Progress: $PERCENT_DONE%"
  fi
fi

done

echo "Found $FAVORITES favorites."

