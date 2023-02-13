# Lookup file(s) by hash in a catalog file.
# lookup [hash] [catalog]

grep "$1" "$2" | cut -d ' ' -f 3-

