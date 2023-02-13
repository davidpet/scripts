# Get just the value of a field without repeating the field name.
# cleantag [field] [file]

exiftool -"$1" "$2" | cut -d ':' -f 2- | cut -d ' ' -f 2-

