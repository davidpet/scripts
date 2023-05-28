eval "$(/opt/homebrew/bin/brew shellenv)"

export PATH=/usr/local/bin:$PATH

# Colorize grep
export GREP_OPTIONS='--color=auto'
export GREP_COLORS='34;35;40' # TODO: get this to work

# Make my shared python libraries available to scripts and notebooks.
export PYTHONPATH=~/repos/projects:$PYTHONPATH

# Use my copy of the pylintrc file for pylint rc configuration.
export PYLINTRC=~/repos/projects/.pylintrc

alias reload='source ~/.bash_profile'

# Format all .py files recursively in a given folder.
alias format-python="yapf --style google --recursive --in-place"

# Lint all .py files recursively in a given folder.
# TODO: figure out why PYLINTRC variable doesn't work on mac.
alias lint-python="pylint --rcfile $PYLINTRC"

alias jupyter-tutorials="jupyter notebook --notebook-dir=~/repos/tutorials/Jupyter"

alias jupyter-snippets="jupyter notebook --notebook-dir=~/repos/snippets"

alias ai="conda activate ai"

# Run Jupyter notebooks in Course Labs folder.
alias jupyter-coursera="jupyter notebook --notebook-dir=~/desktop/CourseraLabs"

# Run Jupyter notebooks in projects folder with no browser.
alias jupyter-projects="jupyter notebook --notebook-dir=~/repos/projects"

# Look for occurences of the given regex pattern within jupyter notebooks from coursera labs.
function grep-coursera() {
  grep -R --exclude-dir='\.ipynb_checkpoints' --include '*.ipynb' "$1" ~/desktop/CourseraLabs
}
