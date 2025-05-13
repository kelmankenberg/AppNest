const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { ipcMain, dialog, BrowserWindow, app } = require('electron');
const Store = require('electron-store');
const path = require('path');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.transports.file.level = 'info';
log.info('App starting...');

// Configure auto-updater
autoUpdater.autoDownload = false; // We'll handle the download manually
autoUpdater.autoInstallOnAppQuit = true; // Auto install on quit if update is downloaded

// Initialize store
const store = new Store({
  name: 'appnest-settings',
  defaults: {
    autoUpdate: true,
    lastUpdateCheck: null,
    updateChannel: 'latest'
  }
});

// Export individual functions for testing
async function checkForUpdates(mainWindow) {
  try {
    log.info('Checking for updates...');
    const result = await autoUpdater.checkForUpdates();
    return result.updateInfo;
  } catch (error) {
    log.error('Error checking for updates:', error);
    throw error;
  }
}

async function downloadUpdate(mainWindow) {
  log.info('Downloading update...');
  await autoUpdater.downloadUpdate();
}

async function installUpdate() {
  log.info('Installing update...');
  autoUpdater.quitAndInstall();
}

class AutoUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.downloadProgress = 0;
    this.init();
  }

  init() {
    // Check for updates on startup if auto-update is enabled
    if (store.get('autoUpdate')) {
      this.checkForUpdates();
    }

    // Set up IPC handlers
    this.setupIpcHandlers();
    
    // Set up auto-updater events
    this.setupAutoUpdaterEvents();
  }

  setupIpcHandlers() {
    ipcMain.handle('check-for-updates', async () => {
      await this.checkForUpdates();
    });

    ipcMain.handle('install-update', () => {
      if (this.updateDownloaded) {
        autoUpdater.quitAndInstall();
      }
    });

    ipcMain.handle('get-update-status', () => {
      return {
        autoUpdate: store.get('autoUpdate'),
        lastUpdateCheck: store.get('lastUpdateCheck'),
        updateAvailable: this.updateAvailable,
        updateDownloaded: this.updateDownloaded,
        downloadProgress: this.downloadProgress,
        currentVersion: autoUpdater.currentVersion.version
      };
    });

    ipcMain.handle('set-auto-update', (event, enabled) => {
      store.set('autoUpdate', enabled);
      return store.get('autoUpdate');
    });
  }

  setupAutoUpdaterEvents() {
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates...');
      this.mainWindow?.webContents.send('update-status', { checking: true });
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info.version);
      this.updateAvailable = true;
      this.mainWindow?.webContents.send('update-available', info);
      
      // Show notification to user
      this.showUpdateAvailableNotification(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('No updates available');
      this.updateAvailable = false;
      this.mainWindow?.webContents.send('update-not-available', info);
      
      // Only show notification if user manually checked
      if (this.userInitiatedCheck) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'No Updates',
          message: 'You are running the latest version of AppNest.',
          buttons: ['OK']
        });
      }
      this.userInitiatedCheck = false;
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.downloadProgress = progressObj.percent;
      this.mainWindow?.webContents.send('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded');
      this.updateDownloaded = true;
      this.mainWindow?.webContents.send('update-downloaded', info);
      
      // Show notification to user
      this.showUpdateReadyNotification(info);
    });

    autoUpdater.on('error', (err) => {
      log.error('Update error:', err);
      this.mainWindow?.webContents.send('update-error', err);
      
      // Show error to user
      dialog.showErrorBox(
        'Update Error',
        'An error occurred while checking for updates. Please try again later.'
      );
    });
  }

  async checkForUpdates(userInitiated = false) {
    this.userInitiatedCheck = userInitiated;
    
    try {
      // Only check if auto-update is enabled or if user manually initiated
      if (store.get('autoUpdate') || userInitiated) {
        log.info('Checking for updates...');
        this.mainWindow?.webContents.send('update-status', { checking: true });
        
        // Clear any previous error state
        this.mainWindow?.webContents.send('update-error', null);
        
        const result = await autoUpdater.checkForUpdates();
        store.set('lastUpdateCheck', new Date().toISOString());
        log.info('Update check complete', result);
        return result;
      }
      return null;
    } catch (error) {
      log.error('Error checking for updates:', error);
      this.mainWindow?.webContents.send('update-error', {
        message: error.message || 'Failed to check for updates.'
      });
      
      // Show error to user if they manually initiated the check
      if (userInitiated) {
        dialog.showErrorBox(
          'Update Error',
          'An error occurred while checking for updates. Please check your internet connection and try again.'
        );
      }
      
      throw error;
    } finally {
      this.mainWindow?.webContents.send('update-status', { checking: false });
    }
  }

  async downloadUpdate() {
    return new Promise((resolve, reject) => {
      log.info('Downloading update...');
      this.mainWindow.webContents.send('download-progress', { percent: 0 });
      
      downloadUpdate(this.mainWindow)
        .then(() => {
          log.info('Update downloaded');
          this.updateDownloaded = true;
          this.mainWindow.webContents.send('update-status', { 
            downloaded: true,
            message: 'Update downloaded. Restart the application to apply the update.'
          });
          resolve();
        })
        .catch(error => {
          log.error('Error downloading update:', error);
          this.mainWindow.webContents.send('update-status', { 
            error: true,
            message: 'Failed to download update. Please try again later.'
          });
          reject(error);
        });
    });
  }

  async showUpdateAvailableNotification(info) {
    try {
      const { response } = await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Would you like to download it now?`,
        detail: info.releaseNotes || 'A new version of AppNest is available for download.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (response === 0) {
        // User clicked Download
        log.info('User initiated update download');
        this.mainWindow?.webContents.send('update-download-started');
        await this.downloadUpdate();
      }
    } catch (error) {
      log.error('Error showing update notification:', error);
      this.mainWindow?.webContents.send('update-error', {
        message: 'Failed to start download. Please try again.'
      });
    }
  }

  async showUpdateReadyNotification(info) {
    try {
      const { response } = await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'The update has been downloaded. Restart the application to apply the updates.',
        detail: `Version ${info.version} is ready to install.`,
        buttons: ['Restart', 'Later'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (response === 0) {
        // User clicked Restart
        log.info('User initiated update installation');
        // Set a flag to indicate we're installing an update
        app.relaunch();
        app.quit();
      }
    } catch (error) {
      log.error('Error showing update ready notification:', error);
      this.mainWindow?.webContents.send('update-error', {
        message: 'Failed to install update. Please try again.'
      });
    }
  }
}

// Export the AutoUpdater class for main process usage
module.exports = AutoUpdater;

// Export individual functions for testing
module.exports.checkForUpdates = checkForUpdates;
module.exports.downloadUpdate = downloadUpdate;
module.exports.installUpdate = installUpdate;
