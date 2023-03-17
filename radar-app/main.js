const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require("fs");

// IMPORTACIONES

const CONFIG_LINES = 10;

// CONSTANTES

var status = 0; // Variable utilizada para cerrar la ventana
// VARIABLES GLOBALES

function readFile(filepath) {
  /*
   * Funcion de lectura sincronica de archivos.
  */
  data = fs.readFileSync(filepath, 'utf8');
  return data;
}

// FUNCIONES GLOBALES

function createWindow (debug) {
  // Crea la ventana del navegador
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    sandbox: false
  });
  mainWindow.setMenu(null);
  mainWindow.maximize();
  mainWindow.show();

  if (debug) mainWindow.webContents.openDevTools();

  // Carga la plantilla del html
  mainWindow.loadFile('index.html');

  mainWindow.on('close', function(event) {

    if (status == 0) {
      if (mainWindow) {
        event.preventDefault();
        mainWindow.webContents.send("app-close");
      }
    }

  });
}

// Metodo invocado cuando Electron finaliza la inicializacion y
// esta listo para cargar la ventana grafica. 
// Algunas APIs pueden solamente ser usadas despues de que este evento ocurra.
app.whenReady().then(() => {
  let file_content;
  
  try {
    file_content = readFile(`${__dirname}/../.config`);
  } catch (error) {
    console.log('\x1b[31m%s\x1b[0m', "\n\nNO EXISTE ARCHIVO DE CONFIGURACION\n\n");
    app.quit();
  }
  
  file_content = file_content.split("|");

  if (file_content.length != CONFIG_LINES) {
    console.log('\x1b[31m%s\x1b[0m', "\n\ARCHIVO DE CONFIGURACION INCORRECTO\n\n");
    app.quit();
  }
  
  let DEBUG = (file_content[1] === "true");

  createWindow(DEBUG);

  app.on('activate', function () {
    // En macOS es comun recrear la ventana de la aplicacion cuando el icono
    // del dock es clickeado y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
});

// Salir cuando todas las ventanas fueron cerradas
app.on('window-all-closed', function () {
  app.quit();
});

// Eventos de comunicacion IPC entre las ventanas y Electron.

ipcMain.on("closed", _ => {
  status = 1;
  app.quit();
});