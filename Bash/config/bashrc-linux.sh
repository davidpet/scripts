SCRIPT_FOLDER="$(dirname "${BASH_SOURCE[0]}")"

source "$SCRIPT_FOLDER/bashrc-common.sh"

# davidpet Stuff
# TODO: figure out how to reload without causing PATH to leak global pip packages.
alias reload='source ~/.bashrc'

# Does an in-place replacement because piping to the same file doesn't work.
function dos2unix() {
  sed -i -e "s/\r//g" $1
}

# Get rid of Jupyter kernel errors in WSL
export JUPYTER_ALLOW_INSECURE_WRITES=true

# Fix Cuda crash on model.fit() in TF.
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH

# Allow 'ng test' to find Windows Chrome in WSL.
export CHROME_BIN=/mnt/c/Program\ Files\ \(x86\)/Google/Chrome/Application/chrome.exe
	
# Quickly switch to AI environment.
alias ai="conda activate ai"

# Run Jupyter notebooks in tutorials folder with no browser so I can hit it from Windows.
alias jupyter-tutorials="jupyter notebook --notebook-dir=~/repos/tutorials/Jupyter --no-browser"

# Run Jupyter notebooks in snippts folder with no browser.
alias jupyter-snippets="jupyter notebook --notebook-dir=~/repos/snippets --no-browser"

# Run Jupyter notebooks in Course Labs folder with no browser.
alias jupyter-coursera="jupyter notebook --notebook-dir=/mnt/p/Training/Coursera\ Courses --no-browser"

# Run Jupyter notebooks in projects folder with no browser.
alias jupyter-projects="jupyter notebook --notebook-dir=~/repos/projects --no-browser"

# Look for occurences of the given regex pattern within jupyter notebooks from coursera labs.
function grep-coursera() {
  grep -R --exclude-dir='\.ipynb_checkpoints' --include '*.ipynb' "$1" "/mnt/p/Training/Coursera Courses"
}

# JDK Paths.
export JAVA_HOME=$HOME/OpenJDK/jdk-21.0.1
export PATH=$JAVA_HOME/bin:$PATH

# Enable communication with x-server on windows host.
export DISPLAY=$(hostname).local:0
