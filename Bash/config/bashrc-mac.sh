eval "$(/opt/homebrew/bin/brew shellenv)"

export PATH=/usr/local/bin:$PATH

# Colorize grep
export GREP_OPTIONS='--color=auto'
export GREP_COLORS='34;35;40' # TODO: get this to work

alias reload='source ~/.bash_profile'

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

# JDK paths.
export JAVA_HOME=$HOME/OpenJDK/jdk-20.0.1.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# Repo scripts.
source ~/repos/projects/setup/java-tools.sh
source ~/repos/projects/setup/python-tools.sh
alias changed=~/repos/projects/scripts/changed.sh
alias tests=~/repos/projects/scripts/tests.sh
