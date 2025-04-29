const { app, BrowserWindow, screen, ipcMain, globalShortcut, dialog } = require('electron');
const { powerDownApp } = require('./functions');
const db = require('./database');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Initialize settings store using dynamic import for ES module compatibility
let store;
(async () => {
    try {
        const { default: Store } = await import('electron-store');
        store = new Store({
            defaults: {
                theme: 'light'
            }
        });
        console.log('Store initialized successfully');
    } catch (err) {
        console.error('Failed to initialize store:', err);
    }
})();

let mainWindow;

// Add function to get drive information
function getDriveInfo() {
    return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
            // On Windows, use wmic to get disk info
            exec('wmic logicaldisk get caption,freespace,size', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                const lines = stdout.trim().split('\n').slice(1);
                const drives = [];

                lines.forEach(line => {
                    // Parse the output to extract drive info
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        const caption = parts[0];
                        const freespace = parseFloat(parts[1]);
                        const size = parseFloat(parts[2]);

                        if (!isNaN(freespace) && !isNaN(size) && size > 0) {
                            const used = size - freespace;
                            const percentUsed = Math.round((used / size) * 100);

                            drives.push({
                                letter: caption,
                                total: size,
                                free: freespace,
                                used: used,
                                percentUsed: percentUsed
                            });
                        }
                    }
                });
                
                resolve(drives);
            });
        } else {
            // For non-Windows platforms, use a simplified approach
            const drives = [];
            const rootPath = '/';
            
            try {
                const stats = fs.statfsSync(rootPath);
                const total = stats.blocks * stats.bsize;
                const free = stats.bfree * stats.bsize;
                const used = total - free;
                const percentUsed = Math.round((used / total) * 100);
                
                drives.push({
                    letter: '/',
                    total: total,
                    free: free,
                    used: used,
                    percentUsed: percentUsed
                });
                
                resolve(drives);
            } catch (err) {
                reject(err);
            }
        }
    });
}

// Add IPC handler for getting drive information
ipcMain.handle('get-drive-info', async () => {
    try {
        const drives = await getDriveInfo();
        return drives;
    } catch (err) {
        console.error('Error getting drive information:', err);
        return [];
    }
});

// Open Windows File Explorer to the app's location
ipcMain.handle('open-explorer', (event) => {
    try {
        const appPath = app.getAppPath();
        console.log('Opening explorer at:', appPath);
        exec(`explorer "${appPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Explorer exec error: ${error}`);
                return false;
            }
            if (stderr) {
                console.error(`Explorer stderr: ${stderr}`);
                return false;
            }
            return true;
        });
        return true;
    } catch (err) {
        console.error('Error opening File Explorer:', err);
        return false;
    }
});

app.on('ready', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Initialize the database
    db.initDatabase()
        .then(() => {
            console.log('Database initialized successfully');
        })
        .catch(err => {
            console.error('Failed to initialize database:', err);
        });

    mainWindow = new BrowserWindow({
        // width: 400,
        width: 400,
        height: 600, // Set the height to 600 as requested
        x: width - 400, // Position the window to the lower right corner
        // x: width - 650, // Position the window to the lower right corner
        y: height - 600,
        frame: false, // Make the window frameless
        resizable: false, // Make the window not resizable
        webPreferences: {
            nodeIntegration: false, // Disable nodeIntegration for security
            contextIsolation: true, // Enable contextIsolation for security
            preload: __dirname + '/preload.js' // Use the preload script
        }
    });

    // Register keyboard shortcuts for DevTools
    globalShortcut.register('CommandOrControl+Shift+I', () => {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
        }
    });
    
    globalShortcut.register('F12', () => {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
        }
    });

    mainWindow.loadFile('index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Removed DOM-related code from the main process
    // All DOM interactions should be handled in the renderer process
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;

        mainWindow = new BrowserWindow({
            width: 400,
            height: 600, // Set the height to 600 as requested
            x: width - 400,
            y: height - 600,
            frame: false, // Make the window frameless
            resizable: false, // Make the window not resizable
            webPreferences: {
                nodeIntegration: false, // Disable nodeIntegration for security
                contextIsolation: true, // Enable contextIsolation for security
                preload: __dirname + '/preload.js' // Use the preload script
            }
        });

        mainWindow.loadFile('index.html');
    }
});

// Handle the quit event from the renderer process
ipcMain.on('app-quit', () => {
    app.quit();
});

// Database IPC handlers
ipcMain.handle('get-all-apps', async () => {
    try {
        return await db.getAllApplications();
    } catch (err) {
        console.error('Error getting apps:', err);
        return [];
    }
});

ipcMain.handle('get-apps-by-category', async () => {
    try {
        return await db.getApplicationsByCategory();
    } catch (err) {
        console.error('Error getting apps by category:', err);
        return [];
    }
});

ipcMain.handle('get-favorite-apps', async () => {
    try {
        return await db.getFavoriteApplications();
    } catch (err) {
        console.error('Error getting favorite apps:', err);
        return [];
    }
});

ipcMain.handle('get-recently-used-apps', async () => {
    try {
        return await db.getRecentlyUsedApplications();
    } catch (err) {
        console.error('Error getting recently used apps:', err);
        return [];
    }
});

ipcMain.handle('get-most-used-apps', async () => {
    try {
        return await db.getMostUsedApplications();
    } catch (err) {
        console.error('Error getting most used apps:', err);
        return [];
    }
});

ipcMain.handle('search-apps', async (_, searchTerm) => {
    try {
        return await db.searchApplications(searchTerm);
    } catch (err) {
        console.error('Error searching apps:', err);
        return [];
    }
});

ipcMain.handle('add-app', async (_, app) => {
    try {
        return await db.addApplication(app);
    } catch (err) {
        console.error('Error adding app:', err);
        throw err;
    }
});

ipcMain.handle('get-categories', async () => {
    try {
        return await db.getCategories();
    } catch (err) {
        console.error('Error getting categories:', err);
        return [];
    }
});

ipcMain.handle('launch-app', async (_, appId) => {
    try {
        // Get the app details
        const apps = await db.getAllApplications();
        const app = apps.find(a => a.id === appId);
        
        if (!app) {
            throw new Error(`Application with ID ${appId} not found`);
        }
        
        // Launch the application
        let command = `"${app.executable_path}"`;
        if (app.launch_arguments) {
            command += ` ${app.launch_arguments}`;
        }
        
        const options = {};
        if (app.working_directory) {
            options.cwd = app.working_directory;
        }
        
        exec(command, options, (err) => {
            if (err) {
                console.error(`Failed to launch application ${app.name}:`, err);
                return;
            }
            
            // Update usage statistics
            db.updateApplicationUsage(appId)
                .catch(err => console.error(`Failed to update usage for ${app.name}:`, err));
        });
        
        return true;
    } catch (err) {
        console.error('Error launching app:', err);
        throw err;
    }
});

// File dialog for selecting executables
ipcMain.handle('select-executable', async () => {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Executables', extensions: ['exe', 'bat', 'cmd'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    } catch (err) {
        console.error('Error selecting executable:', err);
        return null;
    }
});

// Get a specific application by ID
ipcMain.handle('get-app', async (_, appId) => {
    try {
        const apps = await db.getAllApplications();
        const app = apps.find(a => a.id === appId);
        return app || null;
    } catch (err) {
        console.error('Error getting app details:', err);
        return null;
    }
});

// Update an existing application
ipcMain.handle('update-app', async (_, appId, app) => {
    try {
        return await db.updateApplication(appId, app);
    } catch (err) {
        console.error('Error updating app:', err);
        throw err;
    }
});

// Delete an application
ipcMain.handle('delete-app', async (_, appId) => {
    try {
        return await db.deleteApplication(appId);
    } catch (err) {
        console.error('Error deleting app:', err);
        throw err;
    }
});

// Settings handlers
ipcMain.handle('get-theme', () => {
    return store.get('theme');
});

ipcMain.handle('set-theme', (_, theme) => {
    store.set('theme', theme);
    return true;
});