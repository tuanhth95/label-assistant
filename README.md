# Labeling Assistant

## Features
label data from remote server

## how to run
### setup ssh tunneling
open new cmd and type: `ssh -L 8765:localhost:8765 <user>@<sshserver>` and type password
not stop ssh session
move file server.ipynb to server and run
### debug extension
```
cd label-assistant
npm install
npm run compile # or Ctrl+Shift+B
press F5 # in code view
```
### release extension
1. `npm install -g @vscode/vsce`
2. `vsce package`
3. install from VSIX with created .vsix file

