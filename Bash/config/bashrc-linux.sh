# davidpet Stuff
alias reload='source ~/.bashrc'

# Does an in-place replacement because piping to the same file doesn't work.
function dos2unix() {
  sed -i -e "s/\r//g" $1
}

# Get rid of Jupyter kernel errors in WSL
export JUPYTER_ALLOW_INSECURE_WRITES=true

# Fix Cuda crash on model.fit() in TF.
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH

# Make my shared python libraries available to scripts and notebooks.
export PYTHONPATH=~/repos/projects:$PYTHONPATH

# Use my copy of the pylintrc file for pylint rc configuration.
export PYLINTRC=~/repos/projects/.pylintrc

# Allow 'ng test' to find Windows Chrome in WSL.
export CHROME_BIN=/mnt/c/Program\ Files\ \(x86\)/Google/Chrome/Application/chrome.exe
	
# Quickly switch to AI environment.
alias ai="conda activate ai"

# Format all .py files recursively in a given folder.
alias format-python="yapf --style google --recursive --in-place"

# Lint all .py files recursively in a given folder.
alias lint-python="pylint --rcfile $PYLINTRC"  # Needed for now until find out why Mac ignores variable.

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
