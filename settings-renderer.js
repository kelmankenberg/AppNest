// When DOM is loaded, initialize settings window functionality
document.addEventListener('DOMContentLoaded', () => {
    initializeTitleBarButtons();
    initializeSettingsNavigation();
    initializeThemeSettings();
    initializeSliders();
    initializeInputs();
    initializeThemeChangeListener();
    initializeFolderControls();
    initializeWindowsBuiltInApps(); // Add initialization for Windows built-in apps
    loadSettingsFromStore();
});

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
    
    // Default view selector
    const defaultView = document.getElementById('defaultView');
    if (defaultView) {
        defaultView.addEventListener('change', () => {
            const value = defaultView.value;
            // Implement default view saving when API is available
            // window.electronAPI.setDefaultView(value)
            //    .catch(err => console.error('Error saving default view:', err));
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
            console.log('Folder preferences saved');
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
    const folderTypes = ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'];
    
    // Load app folder visibility settings
    folderTypes.forEach(type => {
        loadFolderVisibility('app', type);
    });
    
    // Load Windows folder visibility settings
    folderTypes.forEach(type => {
        loadFolderVisibility('win', type);
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

// Load folder visibility setting for a specific folder type
function loadFolderVisibility(prefix, folderType) {
    const settingKey = `${prefix}Folder_${folderType}`;
    const toggleId = `${prefix}${folderType}`;
    const toggleElement = document.getElementById(toggleId);
    
    if (toggleElement) {
        // Default to visible (checked) if setting doesn't exist
        let isVisible = true;
        
        // Uncomment when API is available:
        // window.electronAPI.getFolderVisibility(settingKey)
        //    .then(visibility => {
        //        // If the setting exists, use it, otherwise default to true
        //        isVisible = visibility !== undefined ? visibility : true;
        //        toggleElement.checked = isVisible;
        //    })
        //    .catch(err => {
        //        console.error(`Error loading ${settingKey} visibility:`, err);
        //        toggleElement.checked = true; // Default to visible on error
        //    });
    }
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
function resetToDefaults() {
    if (confirm('Reset all settings to default values?')) {
        // Reset theme to light and save immediately
        document.body.classList.remove('dark-theme');
        window.electronAPI.setTheme('light')
            .catch(err => console.error('Error saving theme:', err));
        
        // Sync the theme change to the main app
        window.electronAPI.syncTheme('light');
        
        // Update theme options UI
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.toggle('active', option.getAttribute('data-theme') === 'light');
        });
        
        // Reset font size slider
        const fontSizeSlider = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider && fontSizeValue) {
            fontSizeSlider.value = 16;
            fontSizeValue.textContent = '16px';
            // Save font size setting
            window.electronAPI.setFontSize(16)
                .catch(err => console.error('Error saving font size:', err));
        }
        
        // Reset folder toggles - show all folders by default
        resetFolderToggles('app', ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads']);
        resetFolderToggles('win', ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads']);
        
        // Reset to App folders by default
        const appFolderSegment = document.querySelector('.segment-option[data-folder-type="app"]');
        if (appFolderSegment) {
            appFolderSegment.click(); // This will trigger the click handler to display app folders
        }
        
        // Reset app folder path to default
        const pathValueElement = document.querySelector('.path-value');
        if (pathValueElement) {
            pathValueElement.textContent = './AppData';
            // Save when API is available
            // window.electronAPI.setAppFolderPath('./AppData')
            //    .catch(err => console.error('Error saving app folder path:', err));
        }
        
        // Reset other settings to their defaults
        // App name
        const appNameInput = document.getElementById('appName');
        if (appNameInput) {
            appNameInput.value = 'MyPAs Launcher';
            // Save when API is available
        }
        
        // Start with Windows toggle
        const startWithWindows = document.getElementById('startWithWindows');
        if (startWithWindows) {
            startWithWindows.checked = false;
            // Save when API is available
        }
        
        // Default view
        const defaultView = document.getElementById('defaultView');
        if (defaultView) {
            defaultView.value = 'all';
            // Save when API is available
        }
        
        // Search mode
        const searchMode = document.getElementById('searchMode');
        if (searchMode) {
            searchMode.value = 'name';
            // Save when API is available
        }
    }
}

// Reset folder toggles to default (all visible)
function resetFolderToggles(prefix, folderTypes) {
    folderTypes.forEach(type => {
        const toggleId = `${prefix}${type}`;
        const toggleElement = document.getElementById(toggleId);
        
        if (toggleElement) {
            // Set all toggles to checked (visible)
            toggleElement.checked = true;
            
            // Save the visibility setting
            saveFolderPreferences();
        }
    });
}

// Close the settings window
function closeWindow() {
    window.close();
}

// Initialize Windows built-in apps section
function initializeWindowsBuiltInApps() {
    const addAppButtons = document.querySelectorAll('.add-app-button');
    const appAddStatus = document.getElementById('appAddStatus');
    
    addAppButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const appName = button.getAttribute('data-app-name');
            const appPath = button.getAttribute('data-app-path');
            const appCategory = button.getAttribute('data-app-category');
            const appPathType = button.getAttribute('data-app-path-type') || 'system';
            
            try {
                // Call the IPC method to add the Windows app
                await window.electronAPI.addWindowsApp({
                    name: appName,
                    path: appPath,
                    category: appCategory,
                    pathType: appPathType
                });
                
                // Show success message
                appAddStatus.textContent = `${appName} was added to your launcher successfully!`;
                appAddStatus.className = 'app-add-status success';
                
                // Hide the message after 3 seconds
                setTimeout(() => {
                    appAddStatus.style.display = 'none';
                }, 3000);
            } catch (error) {
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