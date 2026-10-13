const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ScoutPro",
    autoHideMenuBar: true, // Esconde a barra superior de ficheiro/editar
    webPreferences: {
      nodeIntegration: true,
    }
  });

  // Carrega a versão final construída do seu React
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // LIGA O PAINEL DE ERROS (RAIO-X)
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});