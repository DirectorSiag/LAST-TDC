set OLDDIR=%CD%

cd %OLDDIR%\radar-app
node_modules\.bin\electron main.js

chdir /d %OLDDIR% &rem restore current directory