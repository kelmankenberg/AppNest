const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    quitApp: () => ipcRenderer.send('app-quit'),
    
    // Settings operations
    getTheme: () => ipcRenderer.invoke('get-theme'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    syncTheme: (theme) => ipcRenderer.send('sync-theme', theme),
    openSettings: () => ipcRenderer.invoke('open-settings'),
    
    // Continue iteration functionality
    getContinueIteration: () => ipcRenderer.invoke('continue-iteration'),
    setContinueIteration: (value) => ipcRenderer.invoke('set-continue-iteration', value),
    
    // Folder preferences operations
    getFolderPreferences: () => ipcRenderer.invoke('get-folder-preferences'),
    setFolderPreferences: (preferences) => ipcRenderer.invoke('set-folder-preferences', preferences),
    syncFolderPreferences: (preferences) => ipcRenderer.send('sync-folder-preferences', preferences),
    
    // Event listeners
    onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (_, theme) => callback(theme)),
    onFolderPreferencesChanged: (callback) => ipcRenderer.on('folder-preferences-changed', (_, preferences) => callback(preferences)),
    
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
    openFileDialog: () => ipcRenderer.invoke('select-executable'), // Added alias to match the function name used in renderer.js
    openExplorer: () => ipcRenderer.invoke('open-explorer'),
    
    // Drive information
    getDriveInfo: () => ipcRenderer.invoke('get-drive-info')
});