# Prints the date the picture or movie was taken.

TAKENDATE=$(~/repos/scripts/Bash/photos/cleantag.sh CreationDate "$1")
if [ -n "$TAKENDATE" ]
then
  echo "$TAKENDATE"
else
  TAKENDATE=$(~/repos/scripts/Bash/photos/cleantag.sh CreateDate "$1")
  if [ -n "$TAKENDATE" ]
  then
    echo "$TAKENDATE"
  else
    ~/repos/scripts/Bash/photos/cleantag.sh FileModifyDate "$1"
  fi
fi

