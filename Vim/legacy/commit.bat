@echo off

REM TODO: detect errors
REM TODO: consolidate with setup.bat later
REM TODO: make this usable from other machines for writing back to thumb drive

REM Copy vimrc and gvrimrc from user folder into real folder
echo ---Copying vimrc and gvimrc---
echo f | xcopy /F /Y "%homedrive%\%homepath%\_vimrc" Configuration
if %errorlevel% neq 0 (
  echo Failed to copy in configuration!
  exit /B 1
)
echo f | xcopy /F /Y "%homedrive%\%homepath%\_gvimrc" Configuration\_gvimrc
if %errorlevel% neq 0 (
  echo Failed to copy in configuration!
  exit /B 1
)

REM Find Vim installation
set VIMFILES_TAIL=\vim\vimfiles
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

REM copy mystuff
echo ---Copying mystuff---
xcopy /F /E /Y /I "%PLUGINS%\mystuff" Plugins\mystuff
if not exist %VIMFILES% (
  echo Vim does not appear to be installed!
  exit /B 1
)

REM Signal Success
echo ---Success!---

