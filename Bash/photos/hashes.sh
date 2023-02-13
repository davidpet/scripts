# Print unique hashes from catalog file.
# If all unique files are preserved after a transformation, the original and new trees should match.
# Use 'diff file1 file2' - should be empty.

cut "$1" -d ' ' -f 1 | uniq

