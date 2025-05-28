const { app, BrowserWindow, screen, ipcMain, globalShortcut, dialog, protocol } = require('electron');
const { powerDownApp } = require('./functions');
const db = require('./database');
const iconManager = require('./icon-manager');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.info('App starting...');

// Auto-updater will be initialized after the main window is created
let autoUpdater = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Another instance is already running
    app.quit();
} else {
    // This is the first instance - set up the second-instance handler
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
            
            // Show the window if it's hidden
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            }
            
            // Show a notification to the user
            const showNotification = () => {
                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.send('show-notification', {
                        title: 'AppNest',
                        body: 'AppNest is already running',
                        silent: true
                    });
                }
            };
            
            // Ensure the window is ready before sending the notification
            if (mainWindow.webContents && !mainWindow.webContents.isLoading()) {
                showNotification();
            } else {
                // If the window is still loading, wait for it to be ready
                const readyListener = () => {
                    showNotification();
                    mainWindow.webContents.off('did-finish-load', readyListener);
                };
                mainWindow.webContents.on('did-finish-load', readyListener);
            }
        }
    });
}

// Initialize settings store
let store;
let mainWindow;
let settingsWindow = null;
let helpWindow = null;
let autoUpdaterUI;
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
            store = new Store({                defaults: {
                    'continue-iteration': true, // Set default value
                    'theme': 'light',
                    'font-size': 10, // Default font size for app table (must be between 9-14px)
                    'start-with-windows': false, // Default auto-start setting
                    'minimize-on-power-button': false, // Default power button behavior is to quit
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
                    },
                    'search-mode': 'name' // Default search mode
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
                },
                'search-mode': 'name' // Default search mode
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
    // Auto-update handlers
    ipcMain.handle('check-for-updates', async (event, userInitiated = true) => {
        try {
            log.info('Checking for updates...');
            if (autoUpdater) {
                const result = await autoUpdater.checkForUpdates(userInitiated);
                log.info('Update check complete');
                return result;
            } else {
                log.warn('Auto-updater not initialized');
                return { error: 'Auto-updater not initialized' };
            }
        } catch (error) {
            log.error('Error checking for updates:', error);
            return { error: error.message || 'Failed to check for updates' };
        }
    });

    ipcMain.handle('install-update', async () => {
        try {
            log.info('Installing update...');
            if (autoUpdater) {
                await autoUpdater.installUpdate();
                return { success: true };
            } else {
                log.warn('Auto-updater not initialized');
                return { error: 'Auto-updater not initialized' };
            }
        } catch (error) {
            log.error('Error installing update:', error);
            return { error: error.message || 'Failed to install update' };
        }
    });

    ipcMain.handle('get-update-status', () => {
        try {
            if (autoUpdater) {
                const status = autoUpdater.getStatus();
                return { ...status };
            }
            return { error: 'Auto-updater not initialized' };
        } catch (error) {
            log.error('Error getting update status:', error);
            return { error: error.message || 'Failed to get update status' };
        }
    });

    ipcMain.handle('set-auto-update', (_, enabled) => {
        try {
            log.info('Setting auto-update to:', enabled);
            if (autoUpdater) {
                autoUpdater.setAutoUpdate(enabled);
                return { success: true };
            }
            return { error: 'Auto-updater not initialized' };
        } catch (error) {
            log.error('Error setting auto-update:', error);
            return { error: error.message || 'Failed to set auto-update' };
        }
    });
    
    // Existing IPC handlers...
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
    ipcMain.on('sync-font-size', (_, size, iconSize) => {
        // If main window exists, update it with the new font size and icon size in real-time
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('font-size-changed', size, iconSize);
        }
    });    // Font size handlers
    ipcMain.handle('get-font-size', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            const storedSize = storeToUse ? storeToUse.get('font-size', '10') : '10';
            // Ensure returned value is within valid range (9-14px)
            const validSize = Math.max(9, Math.min(14, parseInt(storedSize) || 10));
            return validSize.toString();
        } catch (error) {
            console.error('Error in get-font-size handler:', error);
            return '10';
        }
    });

    // Icon size handler
    ipcMain.handle('get-icon-size', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            // If icon-size is not set, calculate it based on font-size
            if (!storeToUse.has('icon-size')) {
                const fontSize = storeToUse.get('font-size', '16');
                // For font size 9px → icon size 14px
                // For font size 14px → icon size 20px
                const minFontSize = 9;
                const maxFontSize = 14;
                const minIconSize = 14;
                const maxIconSize = 20;
                
                // Calculate the icon size based on the font size
                const boundedFontSize = Math.max(minFontSize, Math.min(maxFontSize, parseInt(fontSize)));
                const proportion = (boundedFontSize - minFontSize) / (maxFontSize - minFontSize);
                const iconSize = Math.round(minIconSize + proportion * (maxIconSize - minIconSize));
                
                // Save it for next time
                storeToUse.set('icon-size', iconSize.toString());
                return iconSize.toString();
            }
            return storeToUse.get('icon-size', '20');
        } catch (error) {
            console.error('Error in get-icon-size handler:', error);
            return '20';  // Default icon size
        }
    });

    ipcMain.handle('set-font-size', async (_, size, iconSize) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            if (storeToUse) {
                storeToUse.set('font-size', size);
                // Also store the icon size if provided
                if (iconSize !== undefined) {
                    storeToUse.set('icon-size', iconSize);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error in set-font-size handler:', error);
            return false;
        }
    });

    // Folder preferences handlers - unified API (using hyphenated version)
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

    // For backward compatibility - map camelCase to hyphenated versions
    ipcMain.handle('getFolderPreferences', (event, ...args) => 
        ipcMain.handlers['get-folder-preferences'](event, ...args));

    ipcMain.handle('setFolderPreferences', (event, ...args) => 
        ipcMain.handlers['set-folder-preferences'](event, ...args));

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
        }    });    
    
    // Enhanced file dialog handler with icon extraction    
    ipcMain.handle('openFileDialog', async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'Executables', extensions: ['exe', 'bat', 'cmd'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (result.canceled || result.filePaths.length === 0) {
                return null;
            }

            const filePath = result.filePaths[0];
            
            try {
                // First attempt to get metadata
                let metadata;
                try {
                    metadata = await getExecutableMetadata(filePath);
                    console.log(`Extracted metadata for ${filePath}:`, metadata);
                } catch (metadataErr) {
                    console.warn('Metadata extraction failed, using fallback:', metadataErr);
                    metadata = {
                        name: path.basename(filePath, path.extname(filePath)),
                        description: ''
                    };
                }

                // Then attempt to extract icon independently
                let iconPath = null;
                try {
                    iconPath = await iconManager.getIconForApp(filePath);
                    console.log(`Extracted icon to ${iconPath}`);
                } catch (iconErr) {
                    console.warn('Icon extraction failed:', iconErr);
                }

                // Return all available information, even if some parts failed
                return {
                    path: filePath,
                    name: metadata.name || path.basename(filePath, path.extname(filePath)),
                    description: metadata.description || '',
                    icon_path: iconPath
                };
            } catch (err) {
                console.error('Error processing file:', err);
                // Provide basic fallback even if both metadata and icon extraction fail
                return {
                    path: filePath,
                    name: path.basename(filePath, path.extname(filePath)),
                    description: '',
                    icon_path: null
                };
            }
        } catch (err) {
            console.error('Error in file dialog:', err);
            return null;
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
            const app = apps.find(a => a.id === appId);            if (!app) {
                throw new Error(`Application with ID ${appId} not found`);
            }

            // Get the executable path from the app
            let executablePath = app.executable_path;
            
            // If this is a Windows built-in app, try to resolve its full path at launch time
            if (process.platform === 'win32' && isWindowsBuiltInApp(executablePath)) {
                console.log(`Resolving system path for ${app.name} (${executablePath})`);
                const resolvedPath = await resolveWindowsSystemPath(path.basename(executablePath));
                if (resolvedPath) {
                    console.log(`Successfully resolved path: ${resolvedPath}`);
                    executablePath = resolvedPath;
                } else {
                    console.error(`Failed to resolve system path for ${app.name}`);
                }
            }

            // Ensure proper command formatting using quotes
            let command = `"${executablePath}"`;
            if (app.launch_arguments) {
                command += ` ${app.launch_arguments}`;
            }

            // Set up options for process execution
            const options = {
                windowsHide: false,  // This ensures the window is shown on Windows
                windowsVerbatimArguments: true  // This ensures args are passed correctly on Windows
            };

            if (app.working_directory) {
                options.cwd = app.working_directory;
            }

            console.log(`Launching application with command: ${command}`);
            console.log('Execute options:', options);

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
    });    ipcMain.handle('open-settings', () => {
        createSettingsWindow();
        return true;
    });
    
    // Add handler for closing settings window
    ipcMain.handle('close-settings-window', () => {
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.close();
            return true;
        }
        return false;
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

    // Search mode handlers
    ipcMain.handle('get-search-mode', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse.get('search-mode', 'name');
        } catch (error) {
            console.error('Error getting search mode setting:', error);
            return 'name';
        }
    });

    ipcMain.handle('set-search-mode', async (_, value) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            storeToUse.set('search-mode', value);
            return true;
        } catch (error) {
            console.error('Error setting search mode:', error);
            return false;
        }
    });

    ipcMain.on('sync-search-mode', (_, mode) => {
        // If the main window is open, sync the setting there
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('search-mode-changed', mode);
        }
    });

    // Auto-start with Windows handlers
    ipcMain.handle('set-auto-start', async (_, enable) => {
        try {
            if (process.platform !== 'win32') {
                console.warn('Auto-start is only supported on Windows');
                return false;
            }
            
            // Using child_process to interact with the registry directly
            const { execFile } = require('child_process');
            const util = require('util');
            const execFileAsync = util.promisify(execFile);
            
            const appName = 'AppNest';
            let success = false;
            
            // Create command line with proper quoting
            let execPath = process.execPath; // node.exe in dev, app.exe in prod
            let args = '';
            
            const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
            if (isDev) {
                // In development, point to our main.js file
                args = ` "${path.join(app.getAppPath(), 'main.js')}"`;
            }
            
            const command = `"${execPath}"${args}`;
            console.log(`Setting auto-start with command: ${command}`);
            
            if (enable) {
                // Add to registry - using reg.exe, a built-in Windows command
                try {
                    const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
                    await execFileAsync('reg', ['add', regKey, '/v', appName, '/t', 'REG_SZ', '/d', command, '/f']);
                    console.log(`Registry key set for ${appName}`);
                    success = true;
                } catch (err) {
                    console.error('Failed to set registry key:', err);
                    return false;
                }
            } else {
                // Remove from registry
                try {
                    const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
                    await execFileAsync('reg', ['delete', regKey, '/v', appName, '/f']);
                    console.log(`Registry key removed for ${appName}`);
                    success = true;
                } catch (err) {
                    // An error code of 1 typically means the key was not found, which is fine when disabling
                    if (err.code !== 1) {
                        console.error('Failed to remove registry key:', err);
                        return false;
                    }
                    success = true;
                }
            }
            
            // Store the setting
            const storeToUse = storeInitialized ? store : await initializeStore();
            if (storeToUse) {
                storeToUse.set('start-with-windows', enable);
            }
            
            return success;
        } catch (error) {
            console.error('Error setting auto-start:', error);
            return false;
        }
    });

    ipcMain.handle('get-auto-start', async () => {
        try {
            // Using child_process to interact with the registry directly
            const { execFile } = require('child_process');
            const util = require('util');
            const execFileAsync = util.promisify(execFile);
            
            const appName = 'AppNest';
            let registryExists = false;
            
            // Check if registry key exists
            try {
                const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
                const { stdout } = await execFileAsync('reg', ['query', regKey, '/v', appName]);
                
                // If we got output without error, the key exists
                if (stdout && stdout.includes(appName)) {
                    console.log(`Found registry key for ${appName}`);
                    registryExists = true;
                }
            } catch (err) {
                // An error code of 1 typically means the key was not found
                if (err.code === 1) {
                    console.log('Registry key not found, auto-start is disabled');
                } else {
                    console.error('Error querying registry:', err);
                }
            }
            
            // Get the stored preference
            const storeToUse = storeInitialized ? store : await initializeStore();
            let storedPreference = false;
            
            if (storeToUse) {
                storedPreference = storeToUse.get('start-with-windows', false);
                
                // If actual setting and stored preference are inconsistent, update the stored preference
                if (storedPreference !== registryExists) {
                    storeToUse.set('start-with-windows', registryExists);
                }
            }
            
            return registryExists;
        } catch (error) {
            console.error('Error getting auto-start status:', error);
            return false;
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

    // Add handler for extracting icons directly
    ipcMain.handle('extract-icon', async (_, executablePath) => {
        try {
            if (!executablePath) {
                console.error('No executable path provided for icon extraction');
                return null;
            }
            
            console.log(`Extracting icon from: ${executablePath}`);
            const iconPath = await iconManager.extractIcon(executablePath);
            
            if (iconPath) {
                console.log(`Icon extracted successfully to: ${iconPath}`);
                return { icon_path: iconPath };
            } else {
                console.error('Icon extraction failed');
                return null;
            }
        } catch (err) {
            console.error('Error extracting icon:', err);
            return null;
        }
    });

    // Add handler for show-add-app-dialog event
    ipcMain.on('show-add-app-dialog', () => {
        mainWindow.webContents.send('show-add-app-dialog');
    });

    // Register folder-related IPC handlers
    ipcMain.handle('open-folder', async (_, folderType, folderName) => {
        try {
            console.log(`Opening folder: ${folderType}/${folderName}`);
            
            if (folderType === 'windows') {
                // Check if it's a drive letter
                if (folderName.length === 1) {
                    exec(`explorer ${folderName}:`);
                    return true;
                }
                
                // Open Windows standard user folders
                const userFolders = {
                    'documents': os.homedir() + '\\Documents',
                    'music': os.homedir() + '\\Music',
                    'pictures': os.homedir() + '\\Pictures',
                    'videos': os.homedir() + '\\Videos',
                    'downloads': os.homedir() + '\\Downloads'
                };
                
                if (userFolders[folderName]) {
                    exec(`explorer "${userFolders[folderName]}"`);
                    return true;
                }
                return false;
            } else if (folderType === 'app') {
                // Open app-specific folders
                const storeToUse = storeInitialized ? store : await initializeStore();
                const rootPath = storeToUse.get('appFoldersRootPath', app.getPath('userData'));
                
                // Create the folder path
                const folderPath = path.join(rootPath, folderName.charAt(0).toUpperCase() + folderName.slice(1));
                
                // Ensure folder exists
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }
                
                // Open the folder
                exec(`explorer "${folderPath}"`);
                return true;
            }
            
            return false;
        } catch (err) {
            console.error(`Error opening folder ${folderName}:`, err);
            return false;
        }
    });

    // Add handlers for app folders root path
    ipcMain.handle('get-app-folders-root-path', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse.get('appFoldersRootPath', app.getPath('userData'));
        } catch (err) {
            console.error('Error getting app folders root path:', err);
            return app.getPath('userData');
        }
    });

    ipcMain.handle('set-app-folders-root-path', async (_, folderPath) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            storeToUse.set('appFoldersRootPath', folderPath);
            
            // Ensure the path exists
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            
            return true;
        } catch (err) {
            console.error('Error setting app folders root path:', err);
            return false;
        }
    });

    // App folder path handlers
    ipcMain.handle('get-app-folder-path', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse.get('app-folder-path', './AppData');
        } catch (error) {
            console.error('Error getting app folder path:', error);
            return './AppData';
        }
    });

    ipcMain.handle('set-app-folder-path', async (_, path) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            storeToUse.set('app-folder-path', path);
            return true;
        } catch (error) {
            console.error('Error setting app folder path:', error);
            return false;
        }
    });

    ipcMain.handle('select-app-folder-path', async () => {
        const result = await dialog.showOpenDialog(settingsWindow || mainWindow, {
            properties: ['openDirectory'],
            title: 'Select App Folder Path'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });

    // Version and release notes handlers
    ipcMain.handle('get-app-version', () => {
        try {
            const packageJson = require('./package.json');
            return packageJson.version;
        } catch (error) {
            console.error('Error getting app version:', error);
            return '0.0.0';
        }
    });
    
    ipcMain.handle('read-release-notes', () => {
        try {
            const notesPath = path.join(app.getAppPath(), 'RELEASE_NOTES.md');
            if (fs.existsSync(notesPath)) {
                return fs.readFileSync(notesPath, 'utf8');
            } else {
                console.error('Release notes file not found');
                return '# Release Notes\n\nNo release notes available.';
            }
        } catch (error) {
            console.error('Error reading release notes:', error);
            return '# Release Notes\n\nError loading release notes.';
        }
    });

    // Add handlers for help window
    ipcMain.handle('open-help-window', () => {
        createHelpWindow();
        return true;
    });
    
    ipcMain.handle('close-help-window', () => {
        if (helpWindow && !helpWindow.isDestroyed()) {
            helpWindow.close();
            return true;
        }
        return false;
    });
    
    ipcMain.handle('get-help-content', async (_, topicId) => {
        try {
            // Check if help content file exists for this topic
            const helpContentPath = path.join(app.getAppPath(), 'help-content', `${topicId}.html`);
            if (fs.existsSync(helpContentPath)) {
                return fs.readFileSync(helpContentPath, 'utf8');
            }
            
            // Fallback to generating content from templates
            return generateHelpContent(topicId);
        } catch (error) {
            console.error('Error loading help content:', error);
            return null;
        }
    });
    
    ipcMain.handle('search-help', async (_, searchTerm) => {
        try {
            // Implement a simple search through help content
            // This would be more sophisticated in a real implementation
            const results = await searchHelpContent(searchTerm);
            return results;
        } catch (error) {
            console.error('Error searching help content:', error);
            return [];
        }
    });

    // Add handlers for minimize-on-power-button setting
    ipcMain.handle('get-minimize-on-power-button', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse.get('minimize-on-power-button', false);
        } catch (error) {
            console.error('Error getting minimize-on-power-button setting:', error);
            return false;
        }
    });

    ipcMain.handle('set-minimize-on-power-button', async (_, value) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            storeToUse.set('minimize-on-power-button', value);
            return true;
        } catch (error) {
            console.error('Error setting minimize-on-power-button setting:', error);
            return false;
        }
    });

    ipcMain.on('sync-minimize-on-power-button', (_, enabled) => {
        // If the settings window is open, sync the setting there
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('minimize-on-power-button-changed', enabled);
        }
        // Also sync to main window - allows for real-time UI updates
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('minimize-on-power-button-changed', enabled);
        }
    });

    ipcMain.on('app-quit', () => {
        app.quit();
    });

    ipcMain.on('app-minimize', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });    // Handle adding Windows built-in apps
    ipcMain.handle('add-windows-app', async (_, appInfo) => {
        try {            let executablePath = appInfo.path;
            
            // If this is a Windows built-in app, try to resolve its full path
            if (process.platform === 'win32' && isWindowsBuiltInApp(executablePath)) {// For Windows built-in apps, attempt to resolve the path
                console.log(`Resolving system path for ${appInfo.name} (${executablePath})`);
                const resolvedPath = await resolveWindowsSystemPath(path.basename(executablePath));
                if (resolvedPath) {
                    console.log(`Successfully resolved path: ${resolvedPath}`);
                    executablePath = resolvedPath;
                } else {
                    console.error(`Failed to resolve system path for ${appInfo.name} (${executablePath})`);
                    throw new Error(`Could not resolve system path for ${appInfo.name}`);
                }
            }
            
            // Extract icon from the executable
            console.log(`Extracting icon from: ${executablePath}`);
            const iconPath = await iconManager.extractIcon(executablePath);
              // Get the category ID for 'System'
            const categories = await db.getCategories();
            const systemCategory = categories.find(c => c.name === 'System') 
                || categories.find(c => c.name === 'Administrative')
                || categories.find(c => c.name === 'Office')
                || categories.find(c => c.name === 'Utility');
            
            if (!systemCategory) {
                throw new Error('No suitable category found (System/Administrative/Office/Utility)');
            }

            const appData = {
                name: appInfo.name || path.basename(executablePath, '.exe'),
                executable_path: executablePath,
                is_portable: false,
                category_id: systemCategory.id,
                icon_path: iconPath,
                description: appInfo.description || '',
                publisher: 'Microsoft',
                version: appInfo.version || '',
                launch_mode: 'normal',
                is_favorite: false,
                is_hidden: false            };
            const newAppId = await db.addApp(appData);
            
            // Get the updated list of apps with category information
            const updatedApps = await db.getAllApps();  // Use getAllApps to get complete app info
            
            // Notify both windows to refresh the app list
            [mainWindow, settingsWindow].forEach(window => {
                if (window && !window.isDestroyed()) {
                    console.log('Sending apps-updated event to window:', window.id);
                    // Send the updated apps so they're immediately available
                    window.webContents.send('apps-updated', updatedApps);
                }
            });
            
            return { success: true, id: newAppId };
        } catch (err) {
            console.error('Error adding Windows app:', err);
            throw err;
        }
    });

    // App name handlers
    ipcMain.handle('get-app-name', async () => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            return storeToUse.get('app-name', 'AppNest');
        } catch (error) {
            console.error('Error getting app name setting:', error);
            return 'AppNest';
        }
    });

    ipcMain.handle('set-app-name', async (_, value) => {
        try {
            const storeToUse = storeInitialized ? store : await initializeStore();
            storeToUse.set('app-name', value);
            return true;
        } catch (error) {
            console.error('Error setting app name:', error);
            return false;
        }
    });
}

// Helper function to generate help content
function generateHelpContent(topicId) {
    // In a real app, this would dynamically generate content or load from templates
    // For now, we'll return placeholder content for each topic
    
    const topics = {
        'system-requirements': `
            <h1>System Requirements</h1>
            <p class="introduction">
                AppNest is designed to be lightweight and run efficiently on most modern Windows systems.
            </p>
            <div class="help-section">
                <h2>Minimum Requirements</h2>
                <ul>
                    <li><strong>Operating System:</strong> Windows 10 (64-bit) or newer</li>
                    <li><strong>Processor:</strong> 1.5 GHz dual-core processor or faster</li>
                    <li><strong>Memory:</strong> 2 GB RAM (4 GB recommended)</li>
                    <li><strong>Disk Space:</strong> 100 MB available space</li>
                    <li><strong>Graphics:</strong> Any graphics card with DirectX 10 support</li>
                    <li><strong>Display:</strong> 1280 x 720 resolution or higher</li>
                    <li><strong>Internet:</strong> Not required for basic functionality</li>
                </ul>
            </div>
            <div class="help-section">
                <h2>Recommended Configuration</h2>
                <p>For the best experience with AppNest, we recommend:</p>
                <ul>
                    <li><strong>Operating System:</strong> Windows 10 (64-bit) or Windows 11</li>
                    <li><strong>Processor:</strong> 2.0 GHz quad-core processor or faster</li>
                    <li><strong>Memory:</strong> 8 GB RAM</li>
                    <li><strong>Disk Space:</strong> 500 MB available space (for icon caching)</li>
                    <li><strong>Display:</strong> 1920 x 1080 resolution or higher</li>
                </ul>
            </div>
            <div class="help-section note">
                <p>AppNest is designed to be efficient and should run well even on systems with lower specifications than those listed above.</p>
            </div>
        `,
        'installation': `
            <h1>Installation Guide</h1>
            <p class="introduction">
                Installing AppNest is a straightforward process designed to get you up and running quickly.
            </p>
            <div class="help-section">
                <h2>Standard Installation</h2>
                <ol>
                    <li><strong>Download:</strong> Obtain the latest AppNest installer from our official website</li>
                    <li><strong>Run the Installer:</strong> Double-click the downloaded .exe file</li>
                    <li><strong>Follow Prompts:</strong> Choose your installation folder and preferences</li>
                    <li><strong>Launch:</strong> After installation, AppNest can be started from the desktop shortcut or Start menu</li>
                </ol>
            </div>
            <div class="help-section">
                <h2>Portable Installation</h2>
                <p>AppNest also supports a portable mode with no installation required:</p>
                <ol>
                    <li><strong>Download:</strong> Obtain the portable .zip version of AppNest</li>
                    <li><strong>Extract:</strong> Unzip the archive to any location of your choice</li>
                    <li><strong>Run:</strong> Execute AppNest.exe directly from the extracted folder</li>
                    <li><strong>Optional:</strong> Create a shortcut on your desktop or taskbar</li>
                </ol>
            </div>
            <div class="help-section">
                <h2>First Launch Setup</h2>
                <p>When you first launch AppNest, you'll have the opportunity to:</p>
                <ul>
                    <li>Choose your preferred theme (Light or Dark)</li>
                    <li>Select folder locations for your portable applications</li>
                    <li>Set startup preferences</li>
                    <li>Import existing applications</li>
                </ul>
            </div>
            <div class="help-section warning">
                <p><strong>Note:</strong> Administrative privileges may be required to install AppNest in certain locations (e.g., Program Files). If you encounter permission issues, right-click the installer and select "Run as administrator".</p>
            </div>
        `,
        'add-app': `
            <h1>Adding a New Application</h1>
            <p class="introduction">
                Add your favorite applications to AppNest to create a centralized hub for launching all your software.
            </p>
            <div class="help-section">
                <h2>Adding an Application</h2>
                <ol>
                    <li>Click the <i class="fas fa-th-large"></i> <strong>Apps</strong> button in the right sidebar</li>
                    <li>Select <i class="fas fa-plus-circle"></i> <strong>Add New App</strong> from the menu (or use shortcut Ctrl+Shift+A)</li>
                    <li>In the dialog that appears, fill in the following information:
                        <ul>
                            <li><strong>Application Name:</strong> Enter a name for the application</li>
                            <li><strong>Executable Path:</strong> Click the folder icon to browse and select the .exe file</li>
                            <li><strong>Category:</strong> Select from existing categories or create a new one</li>
                            <li><strong>Type:</strong> Choose whether it's a portable or installed application</li>
                            <li><strong>Description:</strong> Add an optional description</li>
                            <li><strong>Add to favorites:</strong> Check this box to add the app to your favorites</li>
                        </ul>
                    </li>
                    <li>Click <strong>Add Application</strong> to complete the process</li>
                </ol>
                <p>The application will now appear in your AppNest launcher with its icon automatically extracted.</p>
            </div>
            <div class="help-section">
                <h2>Application Details</h2>
                <p>When adding an application, consider the following details:</p>
                <ul>
                    <li><strong>Name:</strong> A clear, recognizable name that helps you identify the app</li>
                    <li><strong>Icon:</strong> AppNest will automatically extract an icon from the executable</li>
                    <li><strong>Category:</strong> Organizing apps by category helps you find them more easily</li>
                    <li><strong>Portable vs. Installed:</strong> Selecting the correct type helps AppNest manage the app appropriately</li>
                </ul>
            </div>
            <div class="help-section tip">
                <p>You can add multiple versions of the same application if needed. Simply provide a unique name for each version.</p>
            </div>
        `
    };
    
    return topics[topicId] || null;
}

// Helper function to search help content
async function searchHelpContent(searchTerm) {
    // In a real app, this would search through all help content files
    // For now, we'll return some placeholder search results
    
    const searchTermLower = searchTerm.toLowerCase();
    const results = [];
    
    // Define some sample search results
    const searchIndex = {
        'welcome': {
            title: 'Welcome to AppNest',
            content: 'AppNest is an application launcher designed to work in harmony with the Windows Start menu or as a standalone launcher.'
        },
        'system-requirements': {
            title: 'System Requirements',
            content: 'AppNest is designed to be lightweight and run efficiently on most modern Windows systems.'
        },
        'installation': {
            title: 'Installation Guide',
            content: 'Installing AppNest is a straightforward process designed to get you up and running quickly.'
        },
        'add-app': {
            title: 'Adding a New Application',
            content: 'Add your favorite applications to AppNest to create a centralized hub for launching all your software.'
        },
        'portable-apps': {
            title: 'Working with Portable Apps',
            content: 'AppNest provides powerful management options for portable applications, making them easy to organize and launch.'
        }
    };
    
    // Search through our mock index
    for (const [id, data] of Object.entries(searchIndex)) {
        const titleMatch = data.title.toLowerCase().includes(searchTermLower);
        const contentMatch = data.content.toLowerCase().includes(searchTermLower);
        
        if (titleMatch || contentMatch) {
            results.push({
                id: id,
                title: data.title,
                excerpt: data.content.substring(0, 100) + '...',
                relevance: titleMatch ? 2 : 1 // Title matches are more relevant
            });
        }
    }
    
    // Sort results by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    return results;
}

// Add function to get drive information
function getDriveInfo() {
    return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
            // Use PowerShell to get drive info (letter, free space, total size)
            const psCommand = `powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Select-Object DeviceID,FreeSpace,Size | ConvertTo-Json"`;
            exec(psCommand, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                let drives = [];
                try {
                    // Parse JSON output (could be array or single object)
                    const data = JSON.parse(stdout);
                    const driveList = Array.isArray(data) ? data : [data];
                    drives = driveList.filter(Boolean).map(disk => {
                        const total = parseFloat(disk.Size);
                        const free = parseFloat(disk.FreeSpace);
                        const used = total - free;
                        const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;
                        return {
                            letter: disk.DeviceID,
                            total,
                            free,
                            used,
                            percentUsed
                        };
                    });
                } catch (e) {
                    reject(e);
                    return;
                }
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

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = 890;
    const windowHeight = 490;
      settingsWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        resizable: false,
        maximizable: false,
        minimizable: true,
        fullscreenable: false,
        parent: mainWindow,
        modal: true,
        frame: false,
        icon: path.join(__dirname, 'resources', 'images', 'nest-with-eggs.244x256.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Calculate and set the window position to center it on the screen
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = Math.floor((screenHeight - windowHeight) / 2);
    settingsWindow.setPosition(x, y);

    settingsWindow.loadFile('settings.html');

    // Add keyboard shortcut for Developer Tools
    settingsWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            settingsWindow.webContents.toggleDevTools();
            event.preventDefault();
        }
    });

    // Clean up the window when it's closed
    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// Create and show help window
function createHelpWindow() {
    // If help window already exists, focus it instead of creating a new one
    if (helpWindow && !helpWindow.isDestroyed()) {
        helpWindow.focus();
        return;
    }

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = 1024;
    const windowHeight = 700;

    helpWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 800,
        minHeight: 600,
        parent: mainWindow,
        modal: false,
        frame: false,
        icon: path.join(__dirname, 'resources', 'images', 'nest-with-eggs.244x256.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Calculate and set the window position to center it on the screen
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = Math.floor((screenHeight - windowHeight) / 2);
    helpWindow.setPosition(x, y);

    helpWindow.loadFile('help.html');

    // Clean up the window when it's closed
    helpWindow.on('closed', () => {
        helpWindow = null;
    });
}

// Initialize auto-updater after app is ready
function initializeAutoUpdater() {
    if (process.env.NODE_ENV === 'test') {
        log.info('Skipping auto-updater in test environment');
        return;
    }

    try {
        const AutoUpdater = require('./auto-updater');
        autoUpdater = new AutoUpdater(mainWindow);
        log.info('Auto-updater initialized');
        
        // Check for updates on startup if auto-update is enabled
        if (store.get('autoUpdate', true)) {
            log.info('Checking for updates on startup...');
            autoUpdater.checkForUpdates(false).catch(err => {
                log.error('Error checking for updates on startup:', err);
            });
        }
    } catch (error) {
        log.error('Failed to initialize auto-updater:', error);
    }
}

// Create main window function
function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    // Define window dimensions
    const windowWidth = 400;
    const windowHeight = 600;
    // Account for taskbar offset (difference between window height and position offset)
    const taskbarOffset = 40; 
    
    // Register protocol for loading app icons
    protocol.registerFileProtocol('app-icons', (request, callback) => {
        try {
            // Strip the protocol prefix
            const url = request.url.substr('app-icons://'.length);
            console.log('Loading icon from:', url);
            callback({ path: url });
        } catch (error) {
            console.error('Error handling app-icons protocol:', error);
        }
    });
    
    // Fixed size window with specific dimensions
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        resizable: false,
        frame: false,
        transparent: false,
        icon: path.join(__dirname, 'resources', 'images', 'nest-with-eggs-blue.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.webContents.openDevTools();

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
        }    });

    // Set up local keyboard shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Check if Ctrl+F is pressed and window is focused
        if (input.control && input.key.toLowerCase() === 'f' && !input.alt && !input.meta) {
            mainWindow.focus(); // Make sure window is focused
            event.preventDefault();  // Prevent default browser Ctrl+F behavior
            mainWindow.webContents.send('focus-search');
        }
    });

    // Register Ctrl+Shift+A shortcut for adding new app
    globalShortcut.register('CommandOrControl+Shift+A', () => {
        mainWindow.webContents.send('show-add-app-dialog');
    });

    mainWindow.loadFile('index.html');
    
    // Initialize the auto-updater after the main window is created
    initializeAutoUpdater();
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

ipcMain.on('app-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
    }
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
    createHelpWindow, // Export the new help window creation function
    startApp,
    getStore: () => store, // Expose store getter for tests
    getDriveInfo // Add getDriveInfo export
};

async function getExecutableMetadata(filePath) {
    try {
        // Extract version info using PowerShell
        const { stdout } = await exec(`powershell -Command "(Get-Item '${filePath}').VersionInfo"`);
        
        // Parse the output to get metadata
        const metadata = {
            name: '',
            description: '',
            icon: ''
        };
        
        // Extract FileDescription and ProductName
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (line.includes('FileDescription')) {
                metadata.description = line.split(':')[1].trim();
            } else if (line.includes('ProductName')) {
                metadata.name = line.split(':')[1].trim();
            }
        }
        
        // If no ProductName, use filename without extension
        if (!metadata.name) {
            metadata.name = path.basename(filePath, '.exe');
        }
        
        // Extract icon and convert to base64
        const pngPath = path.join(os.tmpdir(), `app-icon-${Date.now()}.png`);
        await exec(`powershell -Command "Add-Type -AssemblyName System.Drawing; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${filePath}'); $icon.ToBitmap().Save('${pngPath}', [System.Drawing.Imaging.ImageFormat]::Png)"`);
        
        // Read the PNG file and convert to base64
        const iconBuffer = fs.readFileSync(pngPath);
        metadata.icon = `data:image/png;base64,${iconBuffer.toString('base64')}`;
        
        // Clean up the temporary file
        fs.unlinkSync(pngPath);
        
        return metadata;
    } catch (error) {
        console.error('Error getting executable metadata:', error);
        return {
            name: path.basename(filePath, '.exe'),
            description: '',
            icon: ''
        };
    }
}

/**
 * Resolves the full path for Windows built-in apps
 * @param {string} executableName - The name of the executable (e.g. "write.exe")
 * @returns {Promise<string|null>} - The full path to the executable or null if not found
 */
async function resolveWindowsSystemPath(executableName) {
    if (process.platform !== 'win32') return null;

    const windir = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
    console.log(`Resolving path for ${executableName} in Windows directory: ${windir}`);
    
    // Try to find the executable using our registry first
    const app = WINDOWS_BUILTIN_APPS[executableName.toLowerCase()];
    if (app) {
        console.log(`Found app info for ${executableName}: ${app.name}`);
        
        // First try the Windows system directories
        const systemPaths = [
            path.join(windir, 'System32'),
            path.join(windir, 'SysWOW64'),
            windir
        ];

        // Check each system directory first
        for (const sysPath of systemPaths) {
            const fullPath = path.join(sysPath, executableName);
            try {
                await fs.promises.access(fullPath, fs.constants.F_OK);
                console.log(`Found ${executableName} in system directory: ${fullPath}`);
                return fullPath;
            } catch (err) {
                console.log(`Not found in system directory: ${fullPath}`);
            }
        }

        // Then try the registered paths
        for (const searchPath of app.searchPaths) {
            // Handle paths that start with .. to look outside Windows directory
            let fullPath;
            if (searchPath.startsWith('..')) {
                fullPath = path.join(path.dirname(windir), searchPath.substring(3));
            } else {
                fullPath = path.join(windir, searchPath);
            }
            
            try {
                await fs.promises.access(fullPath, fs.constants.F_OK);
                console.log(`Found ${executableName} at registered path: ${fullPath}`);
                return fullPath;
            } catch (err) {
                console.log(`Not found at registered path: ${fullPath}`);
            }
        }

        // For modern Windows 10/11, try WindowsApps location
        try {
            const programFilesDirs = ['C:\\Program Files', 'C:\\Program Files (x86)'];
            for (const programFilesDir of programFilesDirs) {
                const windowsAppsDir = path.join(programFilesDir, 'WindowsApps');
                console.log(`Checking WindowsApps directory: ${windowsAppsDir}`);
                
                try {                    const entries = await fs.promises.readdir(windowsAppsDir);
                    // Search patterns based on the executable name
                    const searchPatterns = [executableName.toLowerCase()];
                    // First pass: collect all potential matches
                    const matches = entries.filter(entry => 
                        searchPatterns.some(pattern => entry.toLowerCase().includes(pattern))
                    );
                    
                    console.log(`Found ${matches.length} potential matches in WindowsApps:`, matches);
                    
                    // For each match, try different possible locations/names
                    for (const entry of matches) {                        const possibleNames = [executableName];
                        const possibleSubdirs = ['', 'app', 'App', 'bin', 'Bin'];
                        
                        for (const subdir of possibleSubdirs) {
                            for (const exeName of possibleNames) {
                                const appPath = path.join(
                                    windowsAppsDir,
                                    entry,
                                    subdir,
                                    exeName
                                );
                                try {
                                    await fs.promises.access(appPath, fs.constants.F_OK);
                                    console.log(`Found ${executableName} in WindowsApps: ${appPath}`);
                                    return appPath;
                                } catch (err) {
                                    console.log(`Not found at WindowsApps path: ${appPath}`);
                                }
                            }
                        }
                        
                        // Also try searching recursively one level deep
                        try {
                            const entryPath = path.join(windowsAppsDir, entry);
                            const subdirs = await fs.promises.readdir(entryPath, { withFileTypes: true });
                            for (const subdir of subdirs) {
                                if (subdir.isDirectory()) {
                                    for (const exeName of possibleNames) {
                                        const appPath = path.join(entryPath, subdir.name, exeName);
                                        try {
                                            await fs.promises.access(appPath, fs.constants.F_OK);
                                            console.log(`Found ${executableName} in WindowsApps subdirectory: ${appPath}`);
                                            return appPath;
                                        } catch {
                                            console.log(`Not found at WindowsApps subpath: ${appPath}`);
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.log(`Error searching subdirectories in ${entry}:`, err.message);
                        }
                    }
                } catch (err) {
                    console.log(`Error reading WindowsApps directory ${windowsAppsDir}:`, err.message);
                }
            }
        } catch (err) {
            console.log('Could not search WindowsApps directories:', err.message);
        }
    }

    // Fallback to searching common system directories
    const systemPaths = [
        path.join(windir, 'System32'),
        windir,
        path.join(windir, 'SysWOW64')
    ];

    // Check each directory for the executable
    for (const sysPath of systemPaths) {
        const fullPath = path.join(sysPath, executableName);
        try {
            await fs.promises.access(fullPath, fs.constants.F_OK);
            console.log(`Found ${executableName} at ${fullPath}`);
            return fullPath;
        } catch (err) {
            console.log(`Path not found: ${fullPath}`);
            continue;  // File not found in this path
        }
    }
    return null;
}

// Registry of well-known Windows apps and their locations
// Removed WordPad since it's being deprecated in Windows 11
const WINDOWS_BUILTIN_APPS = {
    'notepad.exe': { 
        name: 'Notepad', 
        searchPaths: ['System32/notepad.exe', 'notepad.exe'] 
    },
    'calc.exe': { 
        name: 'Calculator', 
        searchPaths: ['System32/calc.exe'] 
    },
    'mspaint.exe': { 
        name: 'Paint', 
        searchPaths: ['System32/mspaint.exe'] 
    }
};

/**
 * Checks if an app is a Windows built-in app
 * @param {string} executablePath - The path to check
 * @returns {boolean} - True if this is a Windows built-in app
 */
function isWindowsBuiltInApp(executablePath) {
    if (!executablePath) return false;
    const basename = path.basename(executablePath).toLowerCase();
    return WINDOWS_BUILTIN_APPS.hasOwnProperty(basename);
}