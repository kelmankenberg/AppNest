console.log('Settings renderer script loaded');

// When DOM is loaded, initialize settings window functionality
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing settings...');
    
    // Set up event listeners first
    console.log('Setting up event listeners...');
    setupEventListeners();
    console.log('Event listeners setup complete');
    
    // Then initialize other functionality
    console.log('Initializing title bar buttons...');
    initializeTitleBarButtons();
    console.log('Initializing settings navigation...');
    initializeSettingsNavigation();
    console.log('Initializing theme settings...');
    initializeThemeSettings();
    console.log('Initializing sliders...');
    initializeSliders();
    console.log('Initializing inputs...');
    initializeInputs();
    console.log('Initializing theme change listener...');
    initializeThemeChangeListener();
    console.log('Initializing folder controls...');
    initializeFolderControls();
    console.log('Initializing Windows built-in apps...');
    await initializeWindowsBuiltInApps();
    console.log('Initializing apps list...');
    await initializeAppsList();
    console.log('Loading settings from store...');
    loadSettingsFromStore();
    console.log('Settings initialization complete');
});

// Set up all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Set up apps-updated event listener
    console.log('Setting up apps-updated event listener...');
    const cleanup = window.electronAPI.onAppsUpdated((apps) => {
        console.log('Settings: Received apps-updated event');
        console.log('Updated apps list:', apps);
        updateAppList(apps);
    });
    console.log('Apps-updated event listener setup complete');
    
    // Store cleanup function for later use
    window._appsUpdatedCleanup = cleanup;
    console.log('Cleanup function stored');
}

// Initialize titlebar buttons
function initializeTitleBarButtons() {
    const closeButton = document.getElementById('closeSettings');
    const resetButton = document.getElementById('resetSettings');
    
    if (closeButton) {
        closeButton.addEventListener('click', closeWindow);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetToDefaults);
    }
}

// Initialize settings navigation
function initializeSettingsNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const settingsSections = document.querySelectorAll('.settings-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show the corresponding section
            const section = item.getAttribute('data-section');
            settingsSections.forEach(settingsSection => {
                settingsSection.classList.remove('active');
            });
            document.getElementById(section).classList.add('active');
        });
    });
}

// Initialize theme settings with immediate saving
function initializeThemeSettings() {
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all options
            themeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            option.classList.add('active');
            
            // Get the theme value
            const theme = option.getAttribute('data-theme');
            
            // Update visual preview by applying theme to body
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
            
            // Save immediately and sync with main window
            window.electronAPI.setTheme(theme)
                .catch(err => console.error('Error saving theme:', err));
                
            // Sync the theme change to the main app
            window.electronAPI.syncTheme(theme);
        });
    });
}

// Listen for theme changes from the main app
function initializeThemeChangeListener() {
    window.electronAPI.onThemeChanged((theme) => {
        // Update visual state
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // Update theme options UI
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.toggle('active', option.getAttribute('data-theme') === theme);
        });
    });
}

// Initialize slider controls with immediate saving
function initializeSliders() {
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    
    if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.addEventListener('input', () => {
            const value = fontSizeSlider.value;
            fontSizeValue.textContent = `${value}px`;
            
            // Calculate icon size: 14px when font is 9px, 20px when font is 14px
            const iconSize = calculateIconSize(parseInt(value));
            
            // Dynamically update app-table font size and icon size in real-time
            window.electronAPI.syncFontSize(value, iconSize);
        });
        
        fontSizeSlider.addEventListener('change', () => {
            // Save the value when slider stops (mouseup)
            const value = fontSizeSlider.value;
            const iconSize = calculateIconSize(parseInt(value));
            
            // Save font size and icon size to settings
            window.electronAPI.setFontSize(value, iconSize)
                .catch(err => console.error('Error saving font size:', err));
        });
    }
}

// Helper function to calculate proportional icon size based on font size
function calculateIconSize(fontSize) {
    // For font size 9px → icon size 14px
    // For font size 14px → icon size 20px
    // Linear scaling between those points
    const minFontSize = 9;
    const maxFontSize = 14;
    const minIconSize = 14;
    const maxIconSize = 20;
    
    // Ensure fontSize is within bounds
    const boundedFontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
    
    // Calculate the proportion of the way from min to max font size
    const proportion = (boundedFontSize - minFontSize) / (maxFontSize - minFontSize);
    
    // Calculate the icon size based on that proportion
    const iconSize = Math.round(minIconSize + proportion * (maxIconSize - minIconSize));
    
    return iconSize;
}

// Initialize input controls with immediate saving
function initializeInputs() {
    // App name input
    const appNameInput = document.getElementById('appName');
    if (appNameInput) {
        appNameInput.addEventListener('change', () => {
            const value = appNameInput.value;
            // Implement app name saving when API is available
            // window.electronAPI.setAppName(value)
            //    .catch(err => console.error('Error saving app name:', err));
        });
    }
    
    // Start with Windows toggle
    const startWithWindows = document.getElementById('startWithWindows');
    if (startWithWindows) {
        // Initialize the checkbox state from stored settings
        window.electronAPI.getAutoStart()
            .then(enabled => {
                startWithWindows.checked = enabled;
                console.log(`Auto-start is currently ${enabled ? 'enabled' : 'disabled'}`);
            })
            .catch(err => {
                console.error('Error getting auto-start setting:', err);
                startWithWindows.checked = false; // Default to off if there's an error
            });
        
        // Set up listener for changes
        startWithWindows.addEventListener('change', () => {
            const enabled = startWithWindows.checked;
            
            // Show feedback indicator
            const settingGroup = startWithWindows.closest('.setting-group');
            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'setting-status';
            statusIndicator.textContent = 'Saving...';
            settingGroup.appendChild(statusIndicator);
            
            window.electronAPI.setAutoStart(enabled)
                .then(success => {
                    console.log(`Auto-start ${enabled ? 'enabled' : 'disabled'}: ${success}`);
                    statusIndicator.textContent = success ? 'Saved ✓' : 'Failed ✗';
                    statusIndicator.className = `setting-status ${success ? 'success' : 'error'}`;
                    
                    // Remove the status indicator after a delay
                    setTimeout(() => {
                        if (statusIndicator.parentNode) {
                            statusIndicator.parentNode.removeChild(statusIndicator);
                        }
                    }, 3000);
                })
                .catch(err => {
                    console.error('Error saving auto-start setting:', err);
                    statusIndicator.textContent = 'Error ✗';
                    statusIndicator.className = 'setting-status error';
                    
                    // Remove the status indicator after a delay
                    setTimeout(() => {
                        if (statusIndicator.parentNode) {
                            statusIndicator.parentNode.removeChild(statusIndicator);
                        }
                    }, 3000);
                });
        });
    }
    
    // Minimize on Power Button click toggle
    const minimizeOnPowerButton = document.getElementById('minimizeOnPowerButton');
    if (minimizeOnPowerButton) {
        // Initialize the checkbox state from stored settings
        window.electronAPI.getMinimizeOnPowerButton()
            .then(enabled => {
                minimizeOnPowerButton.checked = enabled;
                console.log(`Minimize on power button is currently ${enabled ? 'enabled' : 'disabled'}`);
            })
            .catch(err => {
                console.error('Error getting minimize-on-power-button setting:', err);
                minimizeOnPowerButton.checked = false; // Default to off if there's an error
            });
        
        // Set up listener for changes
        minimizeOnPowerButton.addEventListener('change', () => {
            const enabled = minimizeOnPowerButton.checked;
            
            // Show feedback indicator
            const settingGroup = minimizeOnPowerButton.closest('.setting-group');
            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'setting-status';
            statusIndicator.textContent = 'Saving...';
            settingGroup.appendChild(statusIndicator);
            
            window.electronAPI.setMinimizeOnPowerButton(enabled)
                .then(success => {
                    console.log(`Minimize on power button ${enabled ? 'enabled' : 'disabled'}: ${success}`);
                    statusIndicator.textContent = success ? 'Saved ✓' : 'Failed ✗';
                    statusIndicator.className = `setting-status ${success ? 'success' : 'error'}`;
                    
                    // Sync the change to the main window immediately
                    window.electronAPI.syncMinimizeOnPowerButton(enabled);
                    
                    // Remove the status indicator after a delay
                    setTimeout(() => {
                        if (statusIndicator.parentNode) {
                            statusIndicator.parentNode.removeChild(statusIndicator);
                        }
                    }, 3000);
                })
                .catch(err => {
                    console.error('Error saving minimize-on-power-button setting:', err);
                    statusIndicator.textContent = 'Error ✗';
                    statusIndicator.className = 'setting-status error';
                    
                    // Remove the status indicator after a delay
                    setTimeout(() => {
                        if (statusIndicator.parentNode) {
                            statusIndicator.parentNode.removeChild(statusIndicator);
                        }
                    }, 3000);
                });
        });
    }
    
    // Search mode selector
    const searchMode = document.getElementById('searchMode');
    if (searchMode) {
        searchMode.addEventListener('change', () => {
            const value = searchMode.value;
            // Implement search mode saving when API is available
            // window.electronAPI.setSearchMode(value)
            //    .catch(err => console.error('Error saving search mode:', err));
        });
    }
}

// Initialize folder segment controls and folder toggles
function initializeFolderControls() {
    // Handle segment control switching
    const segmentOptions = document.querySelectorAll('.segment-option');
    const folderContents = document.querySelectorAll('.folder-type-content');
    
    segmentOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all options
            segmentOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            option.classList.add('active');
            
            // Show the corresponding folder content
            const folderType = option.getAttribute('data-folder-type');
            folderContents.forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${folderType}Folders`).classList.add('active');
            
            // Save the active folder type preference and sync with main window
            saveFolderPreferences();
        });
    });
    
    // Initialize app folder toggles
    initializeFolderToggles('app', ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads']);
    
    // Initialize Windows folder toggles
    initializeFolderToggles('win', ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads']);
    
    // Handle app folder path change
    const pathChangeButton = document.querySelector('.path-change-button');
    if (pathChangeButton) {
        pathChangeButton.addEventListener('click', () => {
            // This would open a folder selection dialog
            // window.electronAPI.selectAppFolderPath()
            //    .then(path => {
            //        if (path) {
            //            document.querySelector('.path-value').textContent = path;
            //            // Save the selected app folder path
            //            // window.electronAPI.setAppFolderPath(path)
            //            //    .catch(err => console.error('Error saving app folder path:', err));
            //        }
            //    })
            //    .catch(err => console.error('Error selecting app folder path:', err));
        });
    }
}

// Initialize and handle folder toggles for a specific folder type (app or win)
function initializeFolderToggles(prefix, folderTypes) {
    folderTypes.forEach(type => {
        const toggleId = `${prefix}${type}`;
        const toggleElement = document.getElementById(toggleId);
        
        if (toggleElement) {
            // Add change event listener
            toggleElement.addEventListener('change', () => {
                // Save folder preferences when a toggle changes
                saveFolderPreferences();
            });
        }
    });
}

// Save folder visibility setting and sync with main window
function saveFolderPreferences() {
    // Get active folder type (app or windows)
    const activeFolderType = document.querySelector('.segment-option.active').getAttribute('data-folder-type');
    
    // Build the folder preferences object
    const folderPreferences = {
        folderType: activeFolderType,
        appFolders: {
            documents: document.getElementById('appDocuments').checked,
            music: document.getElementById('appMusic').checked,
            pictures: document.getElementById('appPictures').checked,
            videos: document.getElementById('appVideos').checked,
            downloads: document.getElementById('appDownloads').checked
        },
        windowsFolders: {
            documents: document.getElementById('winDocuments').checked,
            music: document.getElementById('winMusic').checked,
            pictures: document.getElementById('winPictures').checked,
            videos: document.getElementById('winVideos').checked,
            downloads: document.getElementById('winDownloads').checked
        }
    };
    
    // Save to electron store
    window.electronAPI.setFolderPreferences(folderPreferences)
        .then(() => {
            console.log('Folder preferences saved:', folderPreferences);
            
            // Notify main window to update folder button visibility
            window.electronAPI.syncFolderPreferences(folderPreferences);
        })
        .catch(err => {
            console.error('Error saving folder preferences:', err);
        });
}

// Save the currently selected folders
function saveSelectedFolders() {
    // Get all selected folder cards in the currently active folder type
    const activeFolderType = document.querySelector('.segment-option.active').getAttribute('data-folder-type');
    const activeSection = document.getElementById(`${activeFolderType}Folders`);
    const selectedCards = activeSection.querySelectorAll('.folder-card.selected');
    
    // Extract folder paths
    const selectedPaths = Array.from(selectedCards).map(card => {
        return card.querySelector('.folder-card-path').textContent;
    });
    
    // Save the selected folders when API is available
    // window.electronAPI.setSelectedFolders(activeFolderType, selectedPaths)
    //    .catch(err => console.error('Error saving selected folders:', err));
    
    console.log(`Selected ${activeFolderType} folders:`, selectedPaths);
}

// Add a folder card to the current active folder section
function addFolderCard(folderPath) {
    const activeFolderType = document.querySelector('.segment-option.active').getAttribute('data-folder-type');
    const folderCardsContainer = document.querySelector(`#${activeFolderType}Folders .folder-cards`);
    
    // Extract folder name from path
    const folderName = folderPath.split('\\').pop();
    
    const newCard = document.createElement('div');
    newCard.className = 'folder-card selected';
    
    newCard.innerHTML = `
        <i class="fas fa-folder"></i>
        <div class="folder-card-title">${folderName}</div>
        <div class="folder-card-path">${folderPath}</div>
    `;
    
    // Add click handler to the new card
    newCard.addEventListener('click', () => {
        newCard.classList.toggle('selected');
        saveSelectedFolders();
    });
    
    // Insert the new card before the "Add Custom Folder" card
    const addCard = Array.from(folderCardsContainer.children).find(card => {
        return card.querySelector('.folder-card-title').textContent === 'Add Custom Folder';
    });
    
    if (addCard) {
        folderCardsContainer.insertBefore(newCard, addCard);
    } else {
        folderCardsContainer.appendChild(newCard);
    }
    
    // Save selected folders
    saveSelectedFolders();
}

// Load settings from electron-store
function loadSettingsFromStore() {
    // Load theme
    window.electronAPI.getTheme()
        .then(theme => {
            // Apply theme to window
            applyTheme(theme);
            
            // Set the active theme option
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.classList.toggle('active', option.getAttribute('data-theme') === theme);
            });
        })
        .catch(err => {
            console.error('Error loading theme setting:', err);
        });
    
    // Load font size
    window.electronAPI.getFontSize()
        .then(fontSize => {
            const fontSizeSlider = document.getElementById('fontSize');
            const fontSizeValue = document.getElementById('fontSizeValue');
            
            if (fontSizeSlider && fontSizeValue && fontSize) {
                fontSizeSlider.value = fontSize;
                fontSizeValue.textContent = `${fontSize}px`;
            }
        })
        .catch(err => {
            console.error('Error loading font size setting:', err);
        });
    
    // Load folder visibility settings
    loadFolderVisibilitySettings();
    
    // Load active folder type
    loadActiveFolderType();
        
    // Load other settings when they're implemented
}

// Load folder visibility settings for both app and windows folder types
function loadFolderVisibilitySettings() {
    // Get folder preferences from store to set toggle states correctly
    window.electronAPI.getFolderPreferences()
        .then(prefs => {
            if (prefs) {
                // Set the toggle states for app folders
                if (prefs.appFolders) {
                    document.getElementById('appDocuments').checked = !!prefs.appFolders.documents;
                    document.getElementById('appMusic').checked = !!prefs.appFolders.music;
                    document.getElementById('appPictures').checked = !!prefs.appFolders.pictures;
                    document.getElementById('appVideos').checked = !!prefs.appFolders.videos;
                    document.getElementById('appDownloads').checked = !!prefs.appFolders.downloads;
                }
                
                // Set the toggle states for windows folders
                if (prefs.windowsFolders) {
                    document.getElementById('winDocuments').checked = !!prefs.windowsFolders.documents;
                    document.getElementById('winMusic').checked = !!prefs.windowsFolders.music;
                    document.getElementById('winPictures').checked = !!prefs.windowsFolders.pictures;
                    document.getElementById('winVideos').checked = !!prefs.windowsFolders.videos;
                    document.getElementById('winDownloads').checked = !!prefs.windowsFolders.downloads;
                }
                
                console.log('Folder visibility settings loaded from preferences:', prefs);
            } else {
                console.log('No folder preferences found, using defaults (all visible)');
            }
        })
        .catch(err => {
            console.error('Error loading folder preferences:', err);
        });
    
    // Load app folder path
    // window.electronAPI.getAppFolderPath()
    //    .then(path => {
    //        const pathValueElement = document.querySelector('.path-value');
    //        if (pathValueElement && path) {
    //            pathValueElement.textContent = path;
    //        }
    //    })
    //    .catch(err => console.error('Error loading app folder path:', err));
}

// Load the active folder type preference from store
function loadActiveFolderType() {
    // Get folder preferences from store
    window.electronAPI.getFolderPreferences()
        .then(prefs => {
            if (prefs && prefs.folderType) {
                // Activate the appropriate folder type segment
                activateFolderType(prefs.folderType);
            } else {
                // Default to app folders if no preference is saved
                activateFolderType('app');
            }
        })
        .catch(err => {
            console.error('Error loading folder preferences:', err);
            // Default to app folders on error
            activateFolderType('app');
        });
}

// Activate the given folder type segment
function activateFolderType(folderType) {
    const segmentOption = document.querySelector(`.segment-option[data-folder-type="${folderType}"]`);
    if (segmentOption) {
        // Remove active class from all segment options
        document.querySelectorAll('.segment-option').forEach(option => {
            option.classList.remove('active');
        });

        // Add active class to the selected segment
        segmentOption.classList.add('active');

        // Show the corresponding folder content
        document.querySelectorAll('.folder-type-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(`${folderType === 'windows' ? 'windowsFolders' : 'appFolders'}`).classList.add('active');
    }
}

// Apply theme to the settings window
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// Reset all settings to defaults
function resetToDefaults(testAPIs) {
    // Use either the injected APIs for testing or the real window.electronAPI
    const apis = testAPIs || window.electronAPI;
    
    // Show confirmation prompt
    if (confirm('Reset all settings to default values? This will revert all your preferences to their default state.')) {
        // Reset theme to light and save immediately
        document.body.classList.remove('dark-theme');
        apis.setTheme('light')
            .catch(err => console.error('Error saving theme:', err));
        
        // Sync the theme change to the main app
        apis.syncTheme('light');
        
        // Update theme options UI
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.toggle('active', option.getAttribute('data-theme') === 'light');
        });
        
        // Reset font size slider to 14px (as per requirement)
        const fontSizeSlider = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider && fontSizeValue) {
            fontSizeSlider.value = 14;
            fontSizeValue.textContent = '14px';
            
            // Calculate icon size based on the font size
            const iconSize = calculateIconSize(14);
            
            // Save font size and icon size setting
            apis.setFontSize(14, iconSize)
                .catch(err => console.error('Error saving font size:', err));
            
            // Sync the font size change to the main app
            apis.syncFontSize(14, iconSize);
        }
        
        // Reset folder visibility to all ON for both App Folders and Windows Folders
        resetFolderToggles('app', ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'], testAPIs);
        resetFolderToggles('win', ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'], testAPIs);
        
        // Set folder type to 'app' (App Folders)
        activateFolderType('app');
        
        // Reset app folder path to './AppData'
        const pathValueElement = document.querySelector('.path-value');
        if (pathValueElement) {
            pathValueElement.textContent = './AppData';
            // Save the app folder path
            if (apis.setAppFoldersRootPath) {
                apis.setAppFoldersRootPath('./AppData')
                    .catch(err => console.error('Error saving app folder path:', err));
            }
        }
        
        // Reset Start with Windows toggle to OFF
        const startWithWindows = document.getElementById('startWithWindows');
        if (startWithWindows) {
            startWithWindows.checked = false;
            // Save the auto-start setting
            apis.setAutoStart(false)
                .catch(err => console.error('Error saving auto-start setting:', err));
        }
        
        // Reset Minimize on Power Button toggle to OFF
        const minimizeOnPowerButton = document.getElementById('minimizeOnPowerButton');
        if (minimizeOnPowerButton) {
            minimizeOnPowerButton.checked = false;
            // Save the minimize-on-power-button setting
            apis.setMinimizeOnPowerButton(false)
                .catch(err => console.error('Error saving minimize-on-power-button setting:', err));
            
            // Sync the minimize-on-power-button change to the main window immediately
            apis.syncMinimizeOnPowerButton(false);
        }
        
        // Reset Search Mode to 'name' (Name Only)
        const searchMode = document.getElementById('searchMode');
        if (searchMode) {
            searchMode.value = 'name';
            // Save the search mode setting
            if (apis.setSearchMode) {
                apis.setSearchMode('name')
                    .catch(err => console.error('Error saving search mode:', err));
            }
        }
        
        // Create a comprehensive folderPreferences object with all defaults
        const defaultFolderPreferences = {
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
        
        // Save the folder preferences and sync with main window
        apis.setFolderPreferences(defaultFolderPreferences)
            .then(() => {
                console.log('Default folder preferences saved:', defaultFolderPreferences);
                apis.syncFolderPreferences(defaultFolderPreferences);
            })
            .catch(err => {
                console.error('Error saving default folder preferences:', err);
            });
            
        // Show a confirmation message to the user
        const statusMessage = document.createElement('div');
        statusMessage.className = 'settings-status-message';
        statusMessage.textContent = 'Settings reset to default values';
        document.body.appendChild(statusMessage);
        
        // Remove the message after a few seconds
        setTimeout(() => {
            if (statusMessage.parentNode) {
                statusMessage.parentNode.removeChild(statusMessage);
            }
        }, 3000);
    }
}

// Reset folder toggles to default (all visible)
function resetFolderToggles(prefix, folderTypes, testAPIs) {
    // Use either the injected APIs for testing or the real window.electronAPI
    const apis = testAPIs || window.electronAPI;
    
    folderTypes.forEach(type => {
        const toggleId = `${prefix}${type}`;
        const toggleElement = document.getElementById(toggleId);
        
        if (toggleElement) {
            // Set all toggles to checked (visible)
            toggleElement.checked = true;
        }
    });
    
    // After toggling all folders, save the preferences if not in test mode
    if (!testAPIs) {
        saveFolderPreferences();
    }
}

// Close the settings window
function closeWindow() {
    window.close();
}

// Initialize Windows built-in apps section
async function initializeWindowsBuiltInApps() {
    console.log('Initializing Windows built-in apps...');
    const addAppButtons = document.querySelectorAll('.add-app-button');
    console.log('Found add app buttons:', addAppButtons.length);
    const appAddStatus = document.getElementById('appAddStatus');
    
    // Get initial list of apps to check which ones are already added
    console.log('Fetching initial apps list...');
    const initialApps = await window.electronAPI.getAllApps();
    console.log('Initial apps list:', initialApps);
    updateAppList(initialApps);
    
    addAppButtons.forEach(button => {
        console.log('Setting up click handler for button:', button.getAttribute('data-app-name'));
        button.addEventListener('click', async () => {
            const appName = button.getAttribute('data-app-name');
            const appPath = button.getAttribute('data-app-path');
            const appCategory = button.getAttribute('data-app-category');
            console.log('Add button clicked for:', appName);
            
            try {
                // Call the IPC method to add the Windows app
                console.log('Calling addWindowsApp with:', { name: appName, path: appPath, category: appCategory });
                await window.electronAPI.addWindowsApp({
                    name: appName,
                    path: appPath,
                    description: `Windows ${appName}`,
                    category: appCategory
                });
                console.log('Windows app added successfully');
                
                // Show success message
                appAddStatus.textContent = `${appName} was added to your launcher successfully!`;
                appAddStatus.className = 'app-add-status success';
                
                // Update button state immediately
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.title = 'Already added';
                
                // Hide the message after 3 seconds
                setTimeout(() => {
                    appAddStatus.style.display = 'none';
                }, 3000);
            } catch (error) {
                console.error('Error adding Windows app:', error);
                // Show error message
                appAddStatus.textContent = `Failed to add ${appName}: ${error.message}`;
                appAddStatus.className = 'app-add-status error';
                
                // Hide the message after 5 seconds
                setTimeout(() => {
                    appAddStatus.style.display = 'none';
                }, 5000);
            }
        });
    });
}

// Initialize apps list
async function initializeAppsList() {
    console.log('Initializing apps list...');
    try {
        // Get initial list of apps
        console.log('Fetching initial apps list...');
        const apps = await window.electronAPI.getAllApps();
        console.log('Initial apps list:', apps);
        updateAppList(apps);
    } catch (error) {
        console.error('Error initializing apps list:', error);
    }
}

function updateAppList(apps) {
    console.log('Updating app list UI with:', apps);
    // Diagnostic: print all add-app-button elements and their data-app-name attributes
    const addAppButtons = document.querySelectorAll('.add-app-button');
    console.log('Found add app buttons:', addAppButtons.length);
    addAppButtons.forEach((button, idx) => {
        console.log(`Button[${idx}]: data-app-name="${button.getAttribute('data-app-name')}"`);
    });
    // Diagnostic: print all app names in the apps array
    const appNames = apps.map(app => app.name);
    console.log('App names in updated list:', appNames);
    
    addAppButtons.forEach(button => {
        const appName = button.getAttribute('data-app-name');
        const isAppAdded = apps.some(app => app.name === appName);
        console.log(`Checking app ${appName}: isAdded=${isAppAdded}`);
        
        if (isAppAdded) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.title = 'Already added';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-plus"></i>';
            button.title = 'Add application';
        }
    });
}

// Clean up event listeners when the window is closed
window.addEventListener('beforeunload', () => {
    console.log('Window closing, cleaning up event listeners...');
    if (window._appsUpdatedCleanup) {
        window._appsUpdatedCleanup();
        console.log('Apps-updated event listener cleaned up');
    }
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        resetToDefaults,
        calculateIconSize,
        saveFolderPreferences,
        activateFolderType,
        resetFolderToggles
    };
}