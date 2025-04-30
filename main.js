const { app, BrowserWindow, screen, ipcMain, globalShortcut, dialog } = require('electron');
const { powerDownApp } = require('./functions');
const db = require('./database');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Initialize settings store
let store;
let mainWindow;
let settingsWindow; // Add a reference for the settings window
let storeInitialized = false; // Track if store is initialized
let storeInitPromise = null; // Promise for async initialization
let dbInitialized = false; // Track if database is initialized

// Initialize store asynchronously
async function initializeStore() {
    if (store && storeInitialized) {
        return store; // Return existing store if already initialized
    }
    
    // Return existing promise if already initializing
    if (storeInitPromise) {
        return storeInitPromise;
    }
    
    storeInitPromise = (async () => {
        try {
            const Store = (await import('electron-store')).default;
            store = new Store({
                defaults: {
                    'continue-iteration': true, // Set default value
                    'theme': 'light'
                },
                // Add a name to ensure consistency across processes
                name: 'mypa-settings'
            });
            storeInitialized = true;
            console.log('Store initialized asynchronously');
            return store;
        } catch (error) {
            console.error('Failed to initialize store asynchronously:', error);
            // Fall back to sync initialization if async fails
            return initializeStoreSync();
        }
    })();
    
    return storeInitPromise;
}

// Initialize store synchronously (for tests or when async is not possible)
function initializeStoreSync() {
    if (store && storeInitialized) {
        return store; // Return existing store if already initialized
    }
    
    try {
        const Store = require('electron-store');
        store = new Store({
            defaults: {
                'continue-iteration': true, // Set default value
                'theme': 'light'
            },
            // Add a name to ensure consistency across processes
            name: 'mypa-settings'
        });
        storeInitialized = true;
        console.log('Store initialized synchronously');
        return store;
    } catch (error) {
        console.error('Failed to initialize store synchronously:', error);
        throw error;
    }
}

// Get the current store or initialize it safely
async function getStore() {
    // If store is already initialized, return it immediately
    if (store && storeInitialized) {
        return store;
    }
    
    // Try async initialization first
    try {
        return await initializeStore();
    } catch (error) {
        console.error('Async store initialization failed, trying sync:', error);
        // Fall back to synchronous if async fails
        return initializeStoreSync();
    }
}

// Get the current store or initialize it synchronously
function getOrInitializeStore() {
    if (store && storeInitialized) {
        return store;
    }
    return initializeStoreSync();
}

// Initialize the database
async function initializeDatabase() {
    if (dbInitialized) {
        return;
    }
    
    try {
        await db.initDatabase();
        dbInitialized = true;
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// Register IPC handlers
function registerIPCHandlers() {
    // Make sure store is initialized before registering handlers that depend on it
    let currentStore;
    try {
        // Try to get existing store or initialize synchronously for tests
        currentStore = getOrInitializeStore();
    } catch (error) {
        console.error('Failed to initialize store for IPC handlers:', error);
        // Continue with undefined store and register handlers that don't depend on store
    }

    // Theme handlers
    ipcMain.handle('get-theme', async () => {
        try {
            // Always try to get the latest store in case it was initialized after this handler was registered
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse ? storeToUse.get('theme', 'light') : 'light';
        } catch (error) {
            console.error('Error in get-theme handler:', error);
            return 'light';
        }
    });

    ipcMain.handle('continue-iteration', async () => {
        try {
            // Wait for store initialization if it's in progress
            const storeToUse = await getStore();
            if (!storeToUse) {
                console.error('Store not initialized when continue-iteration was called');
                return false;
            }
            const shouldContinue = storeToUse.get('continue-iteration', true);
            console.log(`Continue iteration check: ${shouldContinue}`);
            return shouldContinue;
        } catch (error) {
            console.error('Error in continue-iteration handler:', error);
            return true; // Default to continue if there's an error
        }
    });

    ipcMain.handle('set-continue-iteration', async (_, value) => {
        try {
            // Wait for store initialization if it's in progress
            const storeToUse = await getStore();
            if (!storeToUse) {
                console.error('Store not initialized when set-continue-iteration was called');
                return false;
            }
            console.log(`Setting continue-iteration to: ${value}`);
            storeToUse.set('continue-iteration', value);
            return true;
        } catch (error) {
            console.error('Error in set-continue-iteration handler:', error);
            return false;
        }
    });

    ipcMain.handle('set-theme', async (_, theme) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            if (storeToUse) {
                storeToUse.set('theme', theme);
            }
        } catch (error) {
            console.error('Error in set-theme handler:', error);
        }
    });

    // Theme handlers
    ipcMain.on('sync-theme', (_, theme) => {
        // If settings window exists, send it the new theme
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('theme-changed', theme);
        }
        // If main window exists and the event didn't come from it, update it too
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('theme-changed', theme);
        }
    });

    // Folder preferences handlers
    ipcMain.handle('get-folder-preferences', () => {
        try {
            // Always try to get the latest store
            const storeToUse = currentStore || getOrInitializeStore();
            if (!storeToUse) {
                console.error('Store not initialized when get-folder-preferences was called');
                return getDefaultFolderPreferences();
            }
            // Return preferences or defaults if not found
            return storeToUse.get('folderPreferences', getDefaultFolderPreferences());
        } catch (err) {
            console.error('Error getting folder preferences:', err);
            return getDefaultFolderPreferences();
        }
    });

    function getDefaultFolderPreferences() {
        return {
            folderType: 'app',
            appFolders: {
                documents: true,
                music: true,
                pictures: true,
                videos: true,
                downloads: true
            },
            windowsFolders: {
                documents: true,
                music: true,
                pictures: true,
                videos: true,
                downloads: true
            }
        };
    }

    ipcMain.handle('set-folder-preferences', (_, preferences) => {
        try {
            // Always try to get the latest store
            const storeToUse = currentStore || getOrInitializeStore();
            if (!storeToUse) {
                console.error('Store not initialized when set-folder-preferences was called');
                return false;
            }
            storeToUse.set('folderPreferences', preferences);
            return true;
        } catch (err) {
            console.error('Error setting folder preferences:', err);
            return false;
        }
    });

    // Handle folder preferences synchronization between windows
    ipcMain.on('sync-folder-preferences', (_, preferences) => {
        // If main window exists, update it with the new preferences
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('folder-preferences-changed', preferences);
        }
    });

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
            const apps = await db.getAllApplications();
            const app = apps.find(a => a.id === appId);

            if (!app) {
                throw new Error(`Application with ID ${appId} not found`);
            }

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

                db.updateApplicationUsage(appId)
                    .catch(err => console.error(`Failed to update usage for ${app.name}:`, err));
            });

            return true;
        } catch (err) {
            console.error('Error launching app:', err);
            throw err;
        }
    });

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

    ipcMain.handle('get-app', async (_, appId) => {
        try {
            return await db.getApplicationById(appId);
        } catch (err) {
            console.error('Error getting app details:', err);
            return null;
        }
    });

    ipcMain.handle('update-app', async (_, app) => {
        try {
            return await db.updateApplication(app.id, app);
        } catch (err) {
            console.error('Error updating app:', err);
            throw err;
        }
    });

    ipcMain.handle('delete-app', async (_, appId) => {
        try {
            return await db.deleteApplication(appId);
        } catch (err) {
            console.error('Error deleting app:', err);
            throw err;
        }
    });

    ipcMain.handle('open-settings', () => {
        createSettingsWindow();
        return true;
    });
}

// Add function to get drive information
function getDriveInfo() {
    return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
            exec('wmic logicaldisk get caption,freespace,size', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                const lines = stdout.trim().split('\n').slice(1);
                const drives = [];

                lines.forEach(line => {
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

// Create and show settings window
function createSettingsWindow() {
    // If settings window already exists, focus it instead of creating a new one
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 890,
        height: 490,
        resizable: false,
        maximizable: false,
        minimizable: true,
        fullscreenable: false,
        center: true,
        parent: mainWindow,
        modal: true,
        frame: false,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    settingsWindow.loadFile('settings.html');

    // Clean up the window when it's closed
    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// Create main window function
function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    // Define window dimensions
    const windowWidth = 400;
    const windowHeight = 600;
    // Account for taskbar offset (difference between window height and position offset)
    const taskbarOffset = 40; 
    
    // Fixed size window with specific dimensions
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        resizable: false,
        frame: false,
        transparent: false,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Position the window to be flush with the taskbar in the bottom right
    // Subtract window width from screen width and account for taskbar offset when positioning
    mainWindow.setPosition(width - windowWidth, height - (windowHeight - taskbarOffset));

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
}

// App start-up flow
async function startApp() {
    try {
        // Initialize store first before registering handlers
        await initializeStore();
        
        // Initialize database before registering handlers
        await initializeDatabase();
        
        // Register IPC handlers after store and database are initialized
        registerIPCHandlers();
        
        // Create the main window
        createWindow();
    } catch (error) {
        console.error('Error during app startup:', error);
        // Even if there's an error, try to create the window
        // so the user has some UI to interact with
        if (!mainWindow) createWindow();
    }
}

// Main app events
app.whenReady().then(startApp);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('app-quit', () => {
    app.quit();
});

// In test environments, we might need to initialize immediately
// This helps when tests don't wait for app.whenReady()
if (process.env.NODE_ENV === 'test') {
    initializeStoreSync();
    registerIPCHandlers();
}

// Export for testing
module.exports = {
    initializeStore,
    initializeStoreSync,
    getOrInitializeStore,
    initializeDatabase, // Export the new database initialization function
    registerIPCHandlers,
    createWindow,
    createSettingsWindow,
    startApp,
    getStore: () => store, // Expose store getter for tests
};