# davidpet Stuff
alias reload='source ~/.bashrc'

# Does an in-place replacement because piping to the same file doesn't work.
function dos2unix() {
  sed -i -e "s/\r//g" $1
}

# Get rid of Jupyter kernel errors in WSL
export JUPYTER_ALLOW_INSECURE_WRITES=true

