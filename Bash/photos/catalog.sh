# Gets sorted list of SHA-256 hashes in directory tree.
# Ignores hidden files (start with .).

find "$1" -type f -not -name '\.*' -exec sha256sum {} \; | sort

