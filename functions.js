const { ipcRenderer } = require('electron');

// Function to power down the application
function powerDownApp() {
    ipcRenderer.send('app-quit');
}

module.exports = { powerDownApp };