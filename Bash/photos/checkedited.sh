mkdir "$4"

NEXT_ID=1
while read editedFile
do
  originalFile=$(echo "$editedFile" | sed "s/_edited//")
  if [ ! -f "$originalFile" ]
  then
    originalFile=$(echo "$originalFile" | sed "s/.jpg/.png/")
    if [ ! -f "$originalFile" ]
    then
      originalFile=$(echo "$originalFile" | sed "s/.jpeg/.png/")
    fi
    if [ ! -f "$originalFile" ]
    then
      originalFile=$(echo "$originalFile" | sed "s/.png/.PNG/")
    fi
  fi
  originalRating=$(~/repos/scripts/Bash/photos/cleantag.sh Rating "$originalFile")
  editedRating=$(~/repos/scripts/Bash/photos/cleantag.sh Rating "$editedFile")
  if [ "$originalRating" != "$editedRating" ]
  then
    echo "$editedFile has the wrong rating!"
  fi

  nameToArchive=$(basename "$originalFile" | rev | cut -d '.' -f 2- | rev)
  filesToArchive=$(find "$2" -iname "$nameToArchive.*" && find "$3" -name "$nameToArchive.*")
  EXTENSION=$(basename "$originalFile" | rev | cut -d '.' -f 1 | rev)
  SUBFOLDER="$4/$nameToArchive"

  if [ ! -d "$SUBFOLDER" ]
  then
    mkdir "$SUBFOLDER"
  fi

  for file in $filesToArchive
  do
    echo "Moving '$file' to '$SUBFOLDER/$NEXT_ID.$EXTENSION'"
    mv "$file" "$SUBFOLDER/$NEXT_ID.$EXTENSION"
    NEXT_ID=$(( NEXT_ID + 1 ))
  done
done < "$1"

