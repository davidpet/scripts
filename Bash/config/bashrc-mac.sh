SCRIPT_FOLDER="$(dirname "${BASH_SOURCE[0]}")"

source "$SCRIPT_FOLDER/bashrc-common.sh"

eval "$(/opt/homebrew/bin/brew shellenv)"

export PATH=/usr/local/bin:$PATH

# Colorize grep
export GREP_OPTIONS='--color=auto'
export GREP_COLORS='34;35;40' # TODO: get this to work

# TODO: figure out how to reload without causing PATH to leak global pip packages.
alias reload='source ~/.bash_profile'

alias clang-tidy="/opt/homebrew/opt/llvm/bin/clang-tidy"

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

# Run a single source file with clang++.
function clang-run() {
  clang++ -std=c++20 "$1" -o output && ./output
}

# JDK paths.
export JAVA_HOME=$HOME/OpenJDK/jdk-21.0.1.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
