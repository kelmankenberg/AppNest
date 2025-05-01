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
                    'theme': 'light',
                    'font-size': 16, // Default font size for app table
                    'searchbar-style': {
                        'borderTop': false,
                        'borderRight': false,
                        'borderBottom': true,
                        'borderLeft': false,
                        'minimized': false,    // Not fully minimized
                        'compact': true,       // Add compact mode setting
                        'paddingTop': '2px',   // Minimal top padding
                        'paddingBottom': '2px', // Minimal bottom padding
                        'marginTop': '0px',    // No top margin
                        'marginBottom': '0px'  // No bottom margin
                    },
                    'folderPreferences': {
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
                    }
                },
                // Add a name to ensure consistency across processes
                name: 'appnest-settings'
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
                'theme': 'light',
                'font-size': 16, // Default font size for app table
                'searchbar-style': {
                    'borderTop': false,
                    'borderRight': false,
                    'borderBottom': true,
                    'borderLeft': false,
                    'minimized': false,    // Not fully minimized
                    'compact': true,       // Add compact mode setting
                    'paddingTop': '2px',   // Minimal top padding
                    'paddingBottom': '2px', // Minimal bottom padding
                    'marginTop': '0px',    // No top margin
                    'marginBottom': '0px'  // No bottom margin
                },
                'folderPreferences': {
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
                }
            },
            // Add a name to ensure consistency across processes
            name: 'appnest-settings'
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
    
    // Font size sync handler
    ipcMain.on('sync-font-size', (_, size) => {
        // If main window exists, update it with the new font size in real-time
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('font-size-changed', size);
        }
    });

    // Font size handlers
    ipcMain.handle('get-font-size', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse ? storeToUse.get('font-size', '16') : '16';
        } catch (error) {
            console.error('Error in get-font-size handler:', error);
            return '16';
        }
    });

    ipcMain.handle('set-font-size', async (_, size) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            if (storeToUse) {
                storeToUse.set('font-size', size);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error in set-font-size handler:', error);
            return false;
        }
    });

    // File dialog handler
    ipcMain.handle('select-executable', async () => {
        try {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'Executable Files', extensions: ['exe'] }
                ]
            });
            return result.canceled ? null : result.filePaths[0];
        } catch (error) {
            console.error('Error in select-executable handler:', error);
            throw error;
        }
    });

    // Executable metadata handler
    ipcMain.handle('get-executable-metadata', async (_, filePath) => {
        try {
            return await getExecutableMetadata(filePath);
        } catch (error) {
            console.error('Error in get-executable-metadata handler:', error);
            throw error;
        }
    });

    // Apps handlers
    ipcMain.handle('get-all-apps', async () => {
        try {
            return await db.getAllApps();
        } catch (error) {
            console.error('Error in get-all-apps handler:', error);
            throw error;
        }
    });

    ipcMain.handle('add-app', async (_, appData) => {
        try {
            return await db.addApp(appData);
        } catch (error) {
            console.error('Error in add-app handler:', error);
            throw error;
        }
    });

    // Categories handlers
    ipcMain.handle('get-categories', async () => {
        try {
            return await db.getCategories();
        } catch (error) {
            console.error('Error in get-categories handler:', error);
            throw error;
        }
    });

    // Drive info handler
    ipcMain.handle('get-drive-info', async () => {
        try {
            return await getDriveInfo();
        } catch (error) {
            console.error('Error in get-drive-info handler:', error);
            throw error;
        }
    });

    // Search bar style handlers
    ipcMain.handle('get-searchbar-style', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse ? storeToUse.get('searchbar-style', {
                borderTop: false,
                borderRight: false,
                borderBottom: true,
                borderLeft: false,
                minimized: false,
                compact: true,
                paddingTop: '2px',
                paddingBottom: '2px',
                marginTop: '0px',
                marginBottom: '0px'
            }) : {
                borderTop: false,
                borderRight: false,
                borderBottom: true,
                borderLeft: false,
                minimized: false,
                compact: true,
                paddingTop: '2px',
                paddingBottom: '2px',
                marginTop: '0px',
                marginBottom: '0px'
            };
        } catch (error) {
            console.error('Error in get-searchbar-style handler:', error);
            return {
                borderTop: false,
                borderRight: false,
                borderBottom: true,
                borderLeft: false,
                minimized: false,
                compact: true,
                paddingTop: '2px',
                paddingBottom: '2px',
                marginTop: '0px',
                marginBottom: '0px'
            };
        }
    });

    ipcMain.handle('set-searchbar-style', async (_, style) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            if (storeToUse) {
                storeToUse.set('searchbar-style', style);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error in set-searchbar-style handler:', error);
            return false;
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

    // Add IPC handler for getting executable metadata
    ipcMain.handle('get-executable-metadata', async (_, filePath) => {
        try {
            console.log('Getting metadata for file:', filePath);
            return await getExecutableMetadata(filePath);
        } catch (error) {
            console.error('Error getting executable metadata:', error);
            throw error;
        }
    });

    // Database IPC handlers
    ipcMain.handle('get-all-apps', async () => {
        return await db.getAllApps();
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
            return await db.addApp(app);
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
            const apps = await db.getAllApps();
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

    // Add searchbar style handlers
    ipcMain.handle('get-searchbar-style', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            const defaultStyle = {
                borderTop: false,
                borderRight: false,
                borderBottom: true,
                borderLeft: false,
                minimized: false,
                compact: true,
                paddingTop: '2px',
                paddingBottom: '2px',
                marginTop: '0px',
                marginBottom: '0px'
            };
            return storeToUse ? storeToUse.get('searchbar-style', defaultStyle) : defaultStyle;
        } catch (error) {
            console.error('Error in get-searchbar-style handler:', error);
            return {
                borderTop: false,
                borderRight: false,
                borderBottom: true,
                borderLeft: false,
                minimized: false,
                compact: true,
                paddingTop: '2px',
                paddingBottom: '2px',
                marginTop: '0px',
                marginBottom: '0px'
            };
        }
    });

    ipcMain.handle('set-searchbar-style', async (_, styleOptions) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            if (storeToUse) {
                storeToUse.set('searchbar-style', styleOptions);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error in set-searchbar-style handler:', error);
            return false;
        }
    });

    // Handle searchbar style synchronization between windows
    ipcMain.on('sync-searchbar-style', (_, styleOptions) => {
        // If main window exists, update it with the new searchbar style
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('searchbar-style-changed', styleOptions);
        }
        // If settings window exists, update it with the new searchbar style
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('searchbar-style-changed', styleOptions);
        }
    });

    // Add a handler for focusing the search from menu
    ipcMain.handle('focus-search', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('focus-search');
            mainWindow.focus();
            return true;
        }
        return false;
    });

    // Add function to extract executable metadata
    ipcMain.handle('get-executable-metadata', async (_, filePath) => {
        try {
            return await getExecutableMetadata(filePath);
        } catch (err) {
            console.error('Error getting executable metadata:', err);
            return {
                name: path.basename(filePath, '.exe'),
                description: '',
                icon: ''
            };
        }
    });

    // Add handler for show-add-app-dialog event
    ipcMain.on('show-add-app-dialog', () => {
        mainWindow.webContents.send('show-add-app-dialog');
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
    // mainWindow.setPosition(width - windowWidth, height - (windowHeight - taskbarOffset));
    mainWindow.setPosition(width - windowWidth, height - (windowHeight));

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

    // Register search shortcut (Ctrl+F)
    globalShortcut.register('CommandOrControl+F', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('focus-search');
            mainWindow.focus(); // Make sure window is focused
        }
    });

    // Register Ctrl+Shift+A shortcut for adding new app
    globalShortcut.register('CommandOrControl+Shift+A', () => {
        mainWindow.webContents.send('show-add-app-dialog');
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
};

async function getExecutableMetadata(filePath) {
    try {
        console.log('Starting executable metadata extraction for:', filePath);
        
        // Extract version info using PowerShell
        const { stdout, stderr } = await exec(`powershell -Command "(Get-Item '${filePath}').VersionInfo | Format-List *"`);
        
        console.log('Version info extraction completed');
        console.log('Raw version info output:', stdout);
        console.log('Version info errors:', stderr);
        
        // Parse the output to get metadata
        const metadata = {
            name: '',
            description: '',
            iconPath: ''
        };
        
        // Extract FileDescription and ProductName
        if (stdout) {
            const lines = stdout.toString().split('\n');
            console.log('Parsed version info lines:', lines);
            for (const line of lines) {
                if (line.includes('FileDescription')) {
                    metadata.description = line.split(':')[1].trim();
                    console.log('Found FileDescription:', metadata.description);
                } else if (line.includes('ProductName')) {
                    metadata.name = line.split(':')[1].trim();
                    console.log('Found ProductName:', metadata.name);
                }
            }
        }
        
        // If no ProductName, use filename without extension
        if (!metadata.name) {
            metadata.name = path.basename(filePath, '.exe');
            console.log('Using filename as name:', metadata.name);
        }
        
        // Extract icon using Node.js native modules
        // Create icon in app's data directory instead of temp
        const appDataPath = path.join(app.getPath('userData'), 'icons');
        if (!fs.existsSync(appDataPath)) {
            fs.mkdirSync(appDataPath, { recursive: true });
        }
        
        // Generate a unique filename based on the app name
        const appName = metadata.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const pngPath = path.join(appDataPath, `${appName}_icon.png`);

        try {
            // Use Node.js native modules to extract icon
            const { spawn } = require('child_process');
            const { promisify } = require('util');
            const execFile = promisify(require('child_process').execFile);

            // Use the Windows API directly
            const result = await execFile('powershell', [
                '-Command',
                `Add-Type -AssemblyName System.Drawing; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${filePath}'); $bitmap = $icon.ToBitmap(); $bitmap.Save('${pngPath}', [System.Drawing.Imaging.ImageFormat]::Png)`
            ]);

            console.log('Icon extraction completed');
            console.log('Raw icon extraction output:', result.stdout);
            console.log('Icon extraction errors:', result.stderr);

            // Wait a moment for the file to be fully written
            console.log('Waiting for file to be written...');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if the file was created and has content
            console.log('Checking if file exists...');
            if (fs.existsSync(pngPath)) {
                const stats = fs.statSync(pngPath);
                console.log('File exists, checking size:', stats.size);
                if (stats.size > 0) {
                    metadata.iconPath = pngPath;
                    console.log('Icon extracted successfully');
                } else {
                    console.log('Icon file exists but is empty');
                }
            } else {
                console.log('Icon file was not created');
            }
        } catch (error) {
            console.error('Error during icon extraction:', error);
            throw error;
        }
        
        return metadata;
    } catch (error) {
        console.error('Error getting executable metadata:', error);
        return {
            name: path.basename(filePath, '.exe'),
            description: '',
            iconPath: ''
        };
    }
}