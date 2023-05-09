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

# Quickly switch to AI environment.
alias ai="conda activate ai"

# Run Jupyter notebooks in tutorials folder with no browser so I can hit it from Windows.
alias jupyter-tutorials="jupyter notebook --notebook-dir=~/repos/tutorials/Jupyter --no-browser"

# Run Jupyter notebooks in snippts folder with no browser.
alias jupyter-snippets="jupyter notebook --notebook-dir=~/repos/snippets --no-browser"

# Run Jupyter notebooks in Course Labs folder with no browser.
alias jupyter-coursera="jupyter notebook --notebook-dir=/mnt/p/Training/Coursera\ Courses --no-browser"

# Look for occurences of the given regex pattern within jupyter notebooks from coursera labs.
function grep-coursera() {
  grep -R --exclude-dir='\.ipynb_checkpoints' --include '*.ipynb' "$1" "/mnt/p/Training/Coursera Courses"
}

