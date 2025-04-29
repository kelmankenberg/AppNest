const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    quitApp: () => ipcRenderer.send('app-quit'),
    
    // Settings operations
    getTheme: () => ipcRenderer.invoke('get-theme'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    syncTheme: (theme) => ipcRenderer.send('sync-theme', theme),
    openSettings: () => ipcRenderer.invoke('open-settings'),
    
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
    updateApp: (appId, app) => ipcRenderer.invoke('update-app', appId, app),
    deleteApp: (appId) => ipcRenderer.invoke('delete-app', appId),
    getApp: (appId) => ipcRenderer.invoke('get-app', appId),
    launchApp: (appId) => ipcRenderer.invoke('launch-app', appId),
    getCategories: () => ipcRenderer.invoke('get-categories'),
    
    // File operations
    selectExecutable: () => ipcRenderer.invoke('select-executable'),
    openExplorer: () => ipcRenderer.invoke('open-explorer'),
    
    // Drive information
    getDriveInfo: () => ipcRenderer.invoke('get-drive-info')
});