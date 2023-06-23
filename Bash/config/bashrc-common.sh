# Repo scripts.
source ~/repos/projects/setup/java-tools.sh
source ~/repos/projects/setup/python-tools.sh
alias changed=~/repos/projects/scripts/changed.sh
alias tests=~/repos/projects/scripts/tests.sh

# Create a new conda environment and activate it.
# $1 = name
# $2 = python version (eg. 3.11)
function conda-create() {
    conda create -n "$1" python="$2" -y
    conda activate "$1"
}
