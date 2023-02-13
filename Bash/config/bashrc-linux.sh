# davidpet Stuff
alias reload='source ~/.bashrc'

# Does an in-place replacement because piping to the same file doesn't work.
function dos2unix() {
  sed -i -e "s/\r//g" $1
}

# Get rid of Jupyter kernel errors in WSL
export JUPYTER_ALLOW_INSECURE_WRITES=true

# Quickly switch to AI environment.
alias ai="conda activate ai"

# Run Jupyter notebooks in tutorials folder with no browser so I can hit it from Windows.
alias jupyter-tutorials="jupyter notebook --notebook-dir=~/repos/tutorials/Jupyter --no-browser"

