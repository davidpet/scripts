@echo off

REM TODO: make it less easy to accidentally overwrite changed vimrc and gvimrc with old copies

REM prepare user folder [ignores hidden files] (TODO: handle case of extra things being deleted)(TODO: possibly rename Configuration to Home or something)
REM TODO: detect errors

REM TODO:make sure git or svn or whatever files are ignored propery
echo ---Copying configuration files---
xcopy /F /E /Y /I Configuration "%homedrive%\%homepath%"
REM TODO: deduplicate error handling
if %errorlevel% neq 0 (
  echo Failed to copy in configuration!
  exit /B 1
)
REM TODO: rethink this later
echo ---Creating Scratch Buffer Folder---
if not exist "%homedrive%\%homepath%\scratch" mkdir "%homedrive%\%homepath%\scratch"
if %errorlevel% neq 0 (
  echo Failed to create scratch buffer folder!
  exit /B 1
)

REM Find Vim installation
REM TODO: either get these via http or in a zip file when migrate to web (but be able to handle things like the bug fix for NERDTree)
set VIMFILES_TAIL=\vim\vimfiles
REM TODO: clean this up later
set VIMFILES=notvimfiles
if exist F:%VIMFILES_TAIL% set VIMFILES=F:%VIMFILES_TAIL%
if exist E:%VIMFILES_TAIL% set VIMFILES=E:%VIMFILES_TAIL%
if exist D:%VIMFILES_TAIL% set VIMFILES=D:%VIMFILES_TAIL%
if exist C:%VIMFILES_TAIL% set VIMFILES=C:%VIMFILES_TAIL%
if not exist %VIMFILES% (
  echo Vim does not appear to be installed!
  exit /B 1
)
set PLUGINS=%VIMFILES%\bundle

REM Install Pathogen
echo ---Installing Pathogen---
echo f | xcopy /F /Y pathogen.vim %VIMFILES%\autoload\pathogen.vim
if %errorlevel% neq 0 (
  echo Failed to install pathogen!
  exit /B 1
)

REM Install PlugIns
echo ---Installing plugins to %PLUGINS%---
xcopy /E /Y /I /F Plugins "%PLUGINS%"
if %errorlevel% neq 0 (
  echo Failed to install plug-ins!
  exit /B 1
)

REM Signal Success
echo ---Success!---

