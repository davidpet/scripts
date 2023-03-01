eval "$(/opt/homebrew/bin/brew shellenv)"

export PATH=/usr/local/bin:$PATH

# Colorize grep
export GREP_OPTIONS='--color=auto'
export GREP_COLORS='34;35;40' # TODO: get this to work

alias jupyter-tutorials="jupyter notebook --notebook-dir=~/repos/tutorials/Jupyter"

alias jupyter-snippets="jupyter notebook --notebook-dir=~/repos/snippets"

alias ai="conda activate ai"

# Run Jupyter notebooks in Course Labs folder.
alias jupyter-coursera="jupyter notebook --notebook-dir=~/desktop/CourseraLabs"

# Look for occurences of the given regex pattern within jupyter notebooks from coursera labs.
function grep-coursera() {
  grep -R --exclude-dir='\.ipynb_checkpoints' --include '*.ipynb' "$1" ~/desktop/CourseraLabs
}

