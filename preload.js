const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    quitApp: () => ipcRenderer.send('app-quit'),
    
    // Settings operations
    getTheme: () => ipcRenderer.invoke('get-theme'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    syncTheme: (theme) => ipcRenderer.send('sync-theme', theme),
    getFontSize: () => ipcRenderer.invoke('get-font-size'),
    getIconSize: () => ipcRenderer.invoke('get-icon-size'),
    setFontSize: (size, iconSize) => ipcRenderer.invoke('set-font-size', size, iconSize),
    syncFontSize: (size, iconSize) => ipcRenderer.send('sync-font-size', size, iconSize),
    openSettings: () => ipcRenderer.invoke('open-settings'),
    getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
    setAutoStart: (enable) => ipcRenderer.invoke('set-auto-start', enable),
    
    // Continue iteration functionality
    getContinueIteration: () => ipcRenderer.invoke('continue-iteration'),
    setContinueIteration: (value) => ipcRenderer.invoke('set-continue-iteration', value),
    
    // Folder preferences operations
    getFolderPreferences: () => ipcRenderer.invoke('get-folder-preferences'),
    setFolderPreferences: (preferences) => ipcRenderer.invoke('set-folder-preferences', preferences),
    syncFolderPreferences: (preferences) => ipcRenderer.send('sync-folder-preferences', preferences),
    openFolder: (folderType, folderName) => ipcRenderer.invoke('open-folder', folderType, folderName),
    getAppFoldersRootPath: () => ipcRenderer.invoke('get-app-folders-root-path'),
    setAppFoldersRootPath: (path) => ipcRenderer.invoke('set-app-folders-root-path', path),
    
    // Event listeners
    onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (_, theme) => callback(theme)),
    onFolderPreferencesChanged: (callback) => ipcRenderer.on('folder-preferences-changed', (_, preferences) => callback(preferences)),
    onFontSizeChanged: (callback) => ipcRenderer.on('font-size-changed', (_, size) => callback(size)),
    onShowAddAppDialog: (callback) => ipcRenderer.on('show-add-app-dialog', () => callback()),
    
    // Database operations
    getAllApps: () => ipcRenderer.invoke('get-all-apps'),
    getAppsByCategory: () => ipcRenderer.invoke('get-apps-by-category'),
    getFavoriteApps: () => ipcRenderer.invoke('get-favorite-apps'),
    getRecentlyUsedApps: () => ipcRenderer.invoke('get-recently-used-apps'),
    getMostUsedApps: () => ipcRenderer.invoke('get-most-used-apps'),
    searchApps: (term) => ipcRenderer.invoke('search-apps', term),
    addApp: (app) => ipcRenderer.invoke('add-app', app),
    getAppById: (appId) => ipcRenderer.invoke('get-app', appId), // Alias for getApp for better readability
    updateApp: (app) => ipcRenderer.invoke('update-app', app), // Updated to accept a single app object
    removeApp: (appId) => ipcRenderer.invoke('delete-app', appId), // Alias for deleteApp
    getApp: (appId) => ipcRenderer.invoke('get-app', appId),
    launchApp: (appId) => ipcRenderer.invoke('launch-app', appId),
    getCategories: () => ipcRenderer.invoke('get-categories'),
    
    // Windows built-in apps
    addWindowsApp: (appInfo) => ipcRenderer.invoke('add-windows-app', appInfo),
    
    // File operations
    selectExecutable: () => ipcRenderer.invoke('select-executable'),
    openFileDialog: () => ipcRenderer.invoke('openFileDialog'), // Updated to use our enhanced openFileDialog that extracts icons
    openExplorer: () => ipcRenderer.invoke('open-explorer'),
    getExecutableMetadata: (filePath) => ipcRenderer.invoke('get-executable-metadata', filePath),
    extractIcon: (executablePath) => ipcRenderer.invoke('extract-icon', executablePath), // Added extractIcon function
    
    // Drive information
    getDriveInfo: () => ipcRenderer.invoke('get-drive-info')
});

contextBridge.exposeInMainWorld('api', {
    getSearchbarStyle: () => ipcRenderer.invoke('get-searchbar-style'),
    setSearchbarStyle: (style) => ipcRenderer.invoke('set-searchbar-style', style),
    onSearchbarStyleChanged: (callback) => {
        ipcRenderer.on('searchbar-style-changed', (_, style) => callback(style));
        return () => {
            ipcRenderer.removeAllListeners('searchbar-style-changed');
        };
    },
    syncSearchbarStyle: (style) => ipcRenderer.send('sync-searchbar-style', style),
    
    // Search functionality
    focusSearch: () => ipcRenderer.invoke('focus-search'),
    onFocusSearch: (callback) => {
        ipcRenderer.on('focus-search', () => callback());
        return () => ipcRenderer.removeAllListeners('focus-search');
    }
});