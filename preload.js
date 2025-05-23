const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    quitApp: () => ipcRenderer.send('app-quit'),
    minimizeApp: () => ipcRenderer.send('app-minimize'),
    
    // Settings operations
    getTheme: () => ipcRenderer.invoke('get-theme'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    syncTheme: (theme) => ipcRenderer.send('sync-theme', theme),
    getFontSize: () => ipcRenderer.invoke('get-font-size'),
    getIconSize: () => ipcRenderer.invoke('get-icon-size'),
    setFontSize: (size, iconSize) => ipcRenderer.invoke('set-font-size', size, iconSize),
    syncFontSize: (size, iconSize) => ipcRenderer.send('sync-font-size', size, iconSize),
    openSettings: () => ipcRenderer.invoke('open-settings'),
    closeSettingsWindow: () => ipcRenderer.invoke('close-settings-window'),
    getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
    setAutoStart: (enable) => ipcRenderer.invoke('set-auto-start', enable),
    getMinimizeOnPowerButton: () => ipcRenderer.invoke('get-minimize-on-power-button'),
    setMinimizeOnPowerButton: (enable) => ipcRenderer.invoke('set-minimize-on-power-button', enable),
    syncMinimizeOnPowerButton: (enable) => ipcRenderer.send('sync-minimize-on-power-button', enable),
    
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
    onMinimizeOnPowerButtonChanged: (callback) => ipcRenderer.on('minimize-on-power-button-changed', (_, enabled) => callback(enabled)),
    onRefreshApps: (callback) => ipcRenderer.on('refresh-apps', () => callback()),
    onAppsUpdated: (callback) => {
        // Add the new listener without removing existing ones
        const listener = (_, apps) => {
            console.log('Preload: Received apps-updated event with apps:', apps);
            callback(apps);
        };
        ipcRenderer.on('apps-updated', listener);
        // Return cleanup function
        return () => {
            ipcRenderer.removeListener('apps-updated', listener);
        };
    },
    
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
    getDriveInfo: () => ipcRenderer.invoke('get-drive-info'),

    // Version and application info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    readReleaseNotes: () => ipcRenderer.invoke('read-release-notes'),
    
    // Help window functionality
    openHelpWindow: () => ipcRenderer.invoke('open-help-window'),
    closeHelpWindow: () => ipcRenderer.invoke('close-help-window'),
    getHelpContent: (topicId) => ipcRenderer.invoke('get-help-content', topicId),
    searchHelp: (searchTerm) => ipcRenderer.invoke('search-help', searchTerm),
    
    // Notification functionality
    onShowNotification: (callback) => {
        const listener = (_, notification) => callback(notification);
        ipcRenderer.on('show-notification', listener);
        return () => {
            ipcRenderer.removeListener('show-notification', listener);
        };
    },
    
    // Auto-update functionality
    checkForUpdates: () => {
        console.log('Checking for updates...');
        return ipcRenderer.invoke('check-for-updates');
    },
    installUpdate: () => {
        console.log('Installing update...');
        return ipcRenderer.invoke('install-update');
    },
    getUpdateStatus: () => {
        console.log('Getting update status...');
        return ipcRenderer.invoke('get-update-status');
    },
    setAutoUpdate: (enabled) => {
        console.log('Setting auto-update to:', enabled);
        return ipcRenderer.invoke('set-auto-update', enabled);
    },
    onUpdateAvailable: (callback) => {
        console.log('Setting up update-available listener');
        const handler = (_, info) => {
            console.log('Update available:', info);
            callback(info);
        };
        ipcRenderer.on('update-available', handler);
        return () => {
            console.log('Cleaning up update-available listener');
            ipcRenderer.removeListener('update-available', handler);
        };
    },
    onUpdateNotAvailable: (callback) => {
        console.log('Setting up update-not-available listener');
        const handler = (_, info) => {
            console.log('No update available:', info);
            callback(info);
        };
        ipcRenderer.on('update-not-available', handler);
        return () => {
            console.log('Cleaning up update-not-available listener');
            ipcRenderer.removeListener('update-not-available', handler);
        };
    },
    onDownloadProgress: (callback) => {
        console.log('Setting up download-progress listener');
        const handler = (_, progress) => {
            console.log('Download progress:', progress);
            callback(progress);
        };
        ipcRenderer.on('download-progress', handler);
        return () => {
            console.log('Cleaning up download-progress listener');
            ipcRenderer.removeListener('download-progress', handler);
        };
    },
    onUpdateDownloaded: (callback) => {
        console.log('Setting up update-downloaded listener');
        const handler = (_, info) => {
            console.log('Update downloaded:', info);
            callback(info);
        };
        ipcRenderer.on('update-downloaded', handler);
        return () => {
            console.log('Cleaning up update-downloaded listener');
            ipcRenderer.removeListener('update-downloaded', handler);
        };
    },
    onUpdateError: (callback) => {
        console.log('Setting up update-error listener');
        const handler = (_, error) => {
            console.error('Update error:', error);
            callback(error);
        };
        ipcRenderer.on('update-error', handler);
        return () => {
            console.log('Cleaning up update-error listener');
            ipcRenderer.removeListener('update-error', handler);
        };
    },
    onUpdateStatus: (callback) => {
        console.log('Setting up update-status listener');
        const handler = (_, status) => {
            console.log('Update status changed:', status);
            callback(status);
        };
        ipcRenderer.on('update-status', handler);
        return () => {
            console.log('Cleaning up update-status listener');
            ipcRenderer.removeListener('update-status', handler);
        };
    },
    
    // App name operations
    getAppName: () => ipcRenderer.invoke('get-app-name'),
    setAppName: (name) => ipcRenderer.invoke('set-app-name', name),
    
    // Search mode operations
    getSearchMode: () => ipcRenderer.invoke('get-search-mode'),
    setSearchMode: (mode) => ipcRenderer.invoke('set-search-mode', mode),
    syncSearchMode: (mode) => ipcRenderer.send('sync-search-mode', mode),
    onSearchModeChanged: (callback) => ipcRenderer.on('search-mode-changed', (_, mode) => callback(mode)),
    
    // App folder path operations
    getAppFolderPath: () => ipcRenderer.invoke('get-app-folder-path'),
    setAppFolderPath: (path) => ipcRenderer.invoke('set-app-folder-path', path),
    selectAppFolderPath: () => ipcRenderer.invoke('select-app-folder-path')
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