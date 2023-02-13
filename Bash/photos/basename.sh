FULLNAME="$1"
EXTENSION=$(echo "$FULLNAME" | rev | cut -d '.' -f 1 | rev)
FILENAME=$(echo "$FULLNAME" | rev | cut -d '/' -f 1 | cut -d '.' -f 2- | rev)
BASENAME=$(echo "$FILENAME" | cut -d '(' -f 1 | rev | cut -d ' ' -f 2- | rev)

echo "$BASENAME"'.'"$EXTENSION"

