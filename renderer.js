// Load applications from the database
function loadApplications() {
    window.electronAPI.getAllApps().then(apps => {
        displayApplications(apps);
    }).catch(err => {
        console.error('Error loading applications:', err);
    });
}

// Function to display applications in the table
function displayApplications(apps) {
    const tableBody = document.querySelector('.app-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows
    
    if (apps.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="1" class="no-apps">No applications found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    apps.forEach(app => {
        const row = document.createElement('tr');
        row.className = 'app-row';
        row.dataset.appId = app.id;
        
        // Create app name cell
        const nameCell = document.createElement('td');
        nameCell.textContent = app.name;
        row.appendChild(nameCell);
        
        // Add click event to launch the application
        row.addEventListener('click', () => {
            launchApplication(app.id);
        });

        // Add right-click event for context menu
        row.addEventListener('contextmenu', (e) => {
            showContextMenu(e, app.id);
        });
        
        tableBody.appendChild(row);
    });
}

// Show context menu for app items
function showContextMenu(e, appId) {
    e.preventDefault(); // Prevent default context menu
    e.stopPropagation(); // Stop event propagation
    
    const contextMenu = document.getElementById('appContextMenu');
    
    // Store app ID as a data attribute on the context menu
    contextMenu.dataset.appId = appId;
    
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Get menu dimensions
    const menuWidth = 200; // Width defined in CSS
    const menuHeight = contextMenu.offsetHeight || 100; // Default if not yet rendered
    
    // Calculate position, ensuring menu stays within viewport
    let posX = e.clientX;
    let posY = e.clientY;
    
    // Adjust if menu would appear outside right edge
    if (posX + menuWidth > windowWidth) {
        posX = windowWidth - menuWidth - 5;
    }
    
    // Adjust if menu would appear outside bottom edge
    if (posY + menuHeight > windowHeight) {
        posY = windowHeight - menuHeight - 5;
    }
    
    // Position the menu at the cursor location with adjustments
    contextMenu.style.left = posX + 'px';
    contextMenu.style.top = posY + 'px';
    
    // Hide only app and option menus, NOT the context menu
    appsMenu.style.display = 'none';
    optionsMenu.style.display = 'none';
    
    // Ensure the z-index is high enough
    contextMenu.style.zIndex = '2000';
    
    // Display the context menu
    contextMenu.style.display = 'block';
    
    // Add event to close menu when clicking elsewhere
    const closeContextMenu = (event) => {
        if (!contextMenu.contains(event.target)) {
            contextMenu.style.display = 'none';
            document.removeEventListener('mousedown', closeContextMenu);
        }
    };
    
    // Use mousedown instead of click for better responsiveness
    // Add a slight delay before adding the event to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('mousedown', closeContextMenu);
    }, 10);
    
    // Also close on escape key
    const handleEscape = (event) => {
        if (event.key === 'Escape') {
            contextMenu.style.display = 'none';
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Context menu action handlers
document.getElementById('editAppButton').addEventListener('click', () => {
    const appId = document.getElementById('appContextMenu').dataset.appId;
    console.log('Edit button clicked for appId:', appId);
    
    // Hide the context menu
    document.getElementById('appContextMenu').style.display = 'none';
    
    // Open the edit dialog and populate with app data
    window.electronAPI.getAppById(appId).then(app => {
        if (app) {
            console.log('App data retrieved:', app);
            // Populate the edit form with app data
            const editNameElem = document.getElementById('editAppName');
            if (editNameElem) editNameElem.value = app.name;
            
            const editPathElem = document.getElementById('editExecutablePath');
            if (editPathElem) editPathElem.value = app.executable_path;
            
            const editCategoryElem = document.getElementById('editAppCategory');
            if (editCategoryElem) {
                // Ensure categories are loaded before trying to select one
                window.electronAPI.getCategories().then(categories => {
                    // If no categories are loaded yet, populate the dropdown
                    if (editCategoryElem.options.length <= 1) {
                        categories.forEach(category => {
                            const option = document.createElement('option');
                            option.value = category.id;
                            option.textContent = category.name;
                            editCategoryElem.appendChild(option);
                        });
                    }
                    
                    // Now set the selected category based on the app's category_id
                    if (app.category_id) {
                        console.log('Setting category to:', app.category_id);
                        editCategoryElem.value = app.category_id;
                        
                        // Double check if value was set correctly
                        // Sometimes setting the value directly doesn't work if the options aren't fully loaded
                        if (editCategoryElem.value !== app.category_id.toString()) {
                            // Find the option with matching value and select it
                            for (let i = 0; i < editCategoryElem.options.length; i++) {
                                if (editCategoryElem.options[i].value === app.category_id.toString()) {
                                    editCategoryElem.selectedIndex = i;
                                    break;
                                }
                            }
                        }
                    } else {
                        // If no category is set, select the blank option
                        editCategoryElem.value = '';
                    }
                }).catch(err => {
                    console.error('Error loading categories:', err);
                });
            }
            
            const editDescriptionElem = document.getElementById('editAppDescription');
            console.log('editAppDescription element exists:', !!editDescriptionElem);
            if (editDescriptionElem) editDescriptionElem.value = app.description || '';
            
            const editFavoriteElem = document.getElementById('editIsFavorite');
            console.log('editIsFavorite element exists:', !!editFavoriteElem);
            if (editFavoriteElem) editFavoriteElem.checked = app.is_favorite || false;
            
            // Set the app type radio button
            const appTypeRadios = document.getElementsByName('editAppType');
            console.log('editAppType radio buttons found:', appTypeRadios.length);
            for (let radio of appTypeRadios) {
                radio.checked = (radio.value === (app.is_portable ? 'portable' : 'installed'));
            }
            
            // Store the app ID in the hidden field
            const editAppIdElem = document.getElementById('editAppId');
            console.log('editAppId element exists:', !!editAppIdElem);
            if (editAppIdElem) editAppIdElem.value = app.id;
            
            // Show the edit dialog
            const editDialog = document.getElementById('editAppDialog');
            console.log('editAppDialog element exists:', !!editDialog);
            if (editDialog) {
                // Force the dialog to be visible and on top
                editDialog.style.display = 'block';
                editDialog.style.zIndex = '2000';
                console.log('Set editAppDialog display to block with z-index 2000');
                console.log('Current style:', window.getComputedStyle(editDialog).display);
                console.log('Current z-index:', window.getComputedStyle(editDialog).zIndex);
            } else {
                console.error('Edit dialog element not found');
            }
        } else {
            console.error('App data not found for ID:', appId);
        }
    }).catch(err => {
        console.error('Error getting app details:', err);
    });
});

document.getElementById('removeAppButton').addEventListener('click', () => {
    const appId = document.getElementById('appContextMenu').dataset.appId;
    const appContextMenu = document.getElementById('appContextMenu');
    // Hide the context menu
    appContextMenu.style.display = 'none';
    
    // Get app name for the confirmation dialog
    window.electronAPI.getAppById(appId).then(app => {
        if (app) {
            document.getElementById('appNameToRemove').textContent = app.name;
            document.getElementById('confirmRemoveDialog').style.display = 'block';
            
            // Store appId for the confirmation button
            document.getElementById('confirmRemoveApp').dataset.appId = appId;
        }
    }).catch(err => {
        console.error('Error getting app details:', err);
    });
});

// Confirm remove dialog handlers
document.getElementById('closeConfirmDialog').addEventListener('click', () => {
    document.getElementById('confirmRemoveDialog').style.display = 'none';
});

document.getElementById('cancelRemoveApp').addEventListener('click', () => {
    document.getElementById('confirmRemoveDialog').style.display = 'none';
});

document.getElementById('confirmRemoveApp').addEventListener('click', () => {
    const appId = document.getElementById('confirmRemoveApp').dataset.appId;
    
    // Hide the dialog
    document.getElementById('confirmRemoveDialog').style.display = 'none';
    
    // Remove the app
    window.electronAPI.removeApp(appId).then(() => {
        console.log(`Removed app with ID: ${appId}`);
        // Reload the application list
        loadApplications();
    }).catch(err => {
        console.error('Error removing app:', err);
    });
});

// Handle edit app dialog buttons
document.getElementById('closeEditAppDialog').addEventListener('click', () => {
    document.getElementById('editAppDialog').style.display = 'none';
});

document.getElementById('cancelEditApp').addEventListener('click', () => {
    document.getElementById('editAppDialog').style.display = 'none';
});

document.getElementById('editBrowseExecutable').addEventListener('click', () => {
    window.electronAPI.openFileDialog().then(filePath => {
        if (filePath) {
            document.getElementById('editExecutablePath').value = filePath;
        }
    }).catch(err => {
        console.error('Error opening file dialog:', err);
    });
});

document.getElementById('updateApp').addEventListener('click', () => {
    // Get values from the form
    const appId = document.getElementById('editAppId').value;
    const name = document.getElementById('editAppName').value;
    const executable_path = document.getElementById('editExecutablePath').value;
    const category_id = document.getElementById('editAppCategory').value;
    const description = document.getElementById('editAppDescription').value;
    const is_favorite = document.getElementById('editIsFavorite').checked;
    const is_portable = document.querySelector('input[name="editAppType"]:checked').value === 'portable';
    
    // Validate form
    if (!name || !executable_path) {
        // Show error message
        alert('Application name and executable path are required.');
        return;
    }
    
    // Create app object
    const updatedApp = {
        id: appId,
        name,
        executable_path,
        category_id,
        description,
        is_favorite,
        is_portable
    };
    
    // Update the app
    window.electronAPI.updateApp(updatedApp).then(() => {
        // Close the dialog
        document.getElementById('editAppDialog').style.display = 'none';
        
        // Reload the application list
        loadApplications();
    }).catch(err => {
        console.error('Error updating app:', err);
        alert('Failed to update application. Please try again.');
    });
});

// Launch an application
function launchApplication(appId) {
    window.electronAPI.launchApp(appId).then(() => {
        console.log(`Launched application ${appId}`);
    }).catch(err => {
        console.error(`Error launching application ${appId}:`, err);
    });
}

// Power and close button handlers
document.querySelector('button[title="Power"]').addEventListener('click', () => {
    window.electronAPI.quitApp();
});

// Variables for drive panel functionality
let isPanelActive = false;
const systemDriveIndicator = document.getElementById('systemDriveIndicator');
const drivePanel = document.getElementById('drivePanel');

// Function to load and display drive information
function loadDriveInfo() {
    window.electronAPI.getDriveInfo().then(drives => {
        // Find the system drive (usually C:)
        let systemDrive = drives.find(drive => drive.letter === 'C:') || drives[0];
        
        // Clear the system drive indicator
        systemDriveIndicator.innerHTML = '';
        
        // Create the main system drive indicator with just the circle visualization
        const mainDriveCircle = document.createElement('div');
        mainDriveCircle.className = 'drive-circle';
        
        // Add color coding based on usage percentage
        if (systemDrive.percentUsed >= 90) {
            mainDriveCircle.classList.add('danger');
        } else if (systemDrive.percentUsed >= 75) {
            mainDriveCircle.classList.add('warning');
        }
        
        // Format size for tooltip
        const totalGB = (systemDrive.total / (1024 * 1024 * 1024)).toFixed(1);
        const usedGB = (systemDrive.used / (1024 * 1024 * 1024)).toFixed(1);
        const freeGB = (systemDrive.free / (1024 * 1024 * 1024)).toFixed(1);
        
        // Set tooltip for the system drive indicator
        systemDriveIndicator.title = `${systemDrive.letter} - ${systemDrive.percentUsed}% used (${usedGB}GB of ${totalGB}GB, ${freeGB}GB free)`;
        
        // Create SVG for the system drive circle
        mainDriveCircle.innerHTML = `
            <svg viewBox="0 0 36 36">
                <path class="circle-bg"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="circle-fill"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    stroke-dasharray="${systemDrive.percentUsed}, 100"/>
            </svg>
            <span class="drive-letter">${systemDrive.letter.replace(':', '')}</span>
        `;
        
        // Create main drive display with expand icon
        const mainDrive = document.createElement('div');
        mainDrive.className = 'main-drive';
        mainDrive.appendChild(mainDriveCircle);
        
        // Add expand icon
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        mainDrive.appendChild(expandIcon);
        
        // Add main drive to system drive indicator
        systemDriveIndicator.appendChild(mainDrive);
        
        // Clear the drive panel
        drivePanel.innerHTML = '';
        
        // Add all drives to the panel
        drives.forEach(drive => {
            const driveIndicator = createDriveIndicator(drive);
            drivePanel.appendChild(driveIndicator);
        });
    }).catch(err => {
        console.error('Error loading drive information:', err);
    });
}

// Function to create a drive indicator element
function createDriveIndicator(drive) {
    // Format size for the tooltip
    const totalGB = (drive.total / (1024 * 1024 * 1024)).toFixed(1);
    const usedGB = (drive.used / (1024 * 1024 * 1024)).toFixed(1);
    const freeGB = (drive.free / (1024 * 1024 * 1024)).toFixed(1);
    
    // Create drive indicator element
    const driveIndicator = document.createElement('div');
    driveIndicator.className = 'drive-indicator';
    driveIndicator.title = `${drive.letter} - ${drive.percentUsed}% used (${usedGB}GB of ${totalGB}GB, ${freeGB}GB free)`;
    
    // Create drive circle element
    const driveCircle = document.createElement('div');
    driveCircle.className = 'drive-circle';
    
    // Add color coding based on usage percentage
    if (drive.percentUsed >= 90) {
        driveCircle.classList.add('danger');
    } else if (drive.percentUsed >= 75) {
        driveCircle.classList.add('warning');
    }
    
    // Create SVG for the circle
    driveCircle.innerHTML = `
        <svg viewBox="0 0 36 36">
            <path class="circle-bg"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="circle-fill"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                stroke-dasharray="${drive.percentUsed}, 100"/>
        </svg>
        <span class="drive-letter">${drive.letter.replace(':', '')}</span>
    `;
    
    driveIndicator.appendChild(driveCircle);
    return driveIndicator;
}

// Function to toggle the drive panel
function toggleDrivePanel() {
    isPanelActive = !isPanelActive;
    
    if (isPanelActive) {
        drivePanel.classList.add('active');
        systemDriveIndicator.classList.add('expanded');
    } else {
        drivePanel.classList.remove('active');
        systemDriveIndicator.classList.remove('expanded');
    }
}

// Add click event to toggle the drive panel
systemDriveIndicator.addEventListener('click', toggleDrivePanel);

// Close the drive panel when clicking elsewhere
document.addEventListener('click', (e) => {
    if (isPanelActive && 
        !systemDriveIndicator.contains(e.target) && 
        !drivePanel.contains(e.target)) {
        isPanelActive = false;
        drivePanel.classList.remove('active');
        systemDriveIndicator.classList.remove('expanded');
    }
});

// Menu handlers for Apps and Options
const appsButton = document.getElementById('appsButton');
const optionsButton = document.getElementById('optionsButton');
const appsMenu = document.getElementById('appsMenu');
const optionsMenu = document.getElementById('optionsMenu');

appsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close options menu if it's open
    optionsMenu.style.display = 'none';
    
    // Toggle apps menu
    const isVisible = appsMenu.style.display === 'block';
    appsMenu.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // Position the menu relative to the button
        const buttonRect = appsButton.getBoundingClientRect();
        appsMenu.style.top = buttonRect.bottom + 'px';
        appsMenu.style.right = (window.innerWidth - buttonRect.right) + 'px';
    }
});

optionsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close apps menu if it's open
    appsMenu.style.display = 'none';
    
    // Toggle options menu
    const isVisible = optionsMenu.style.display === 'block';
    optionsMenu.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // Position the menu relative to the button
        const buttonRect = optionsButton.getBoundingClientRect();
        optionsMenu.style.top = buttonRect.bottom + 'px';
        optionsMenu.style.right = (window.innerWidth - buttonRect.right) + 'px';
    }
});

// Function to close all menus
function closeAllMenus() {
    appsMenu.style.display = 'none';
    optionsMenu.style.display = 'none';
}

// Close menus when clicking elsewhere
document.addEventListener('click', closeAllMenus);

// Prevent menu from closing when clicking inside it
appsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

optionsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Theme toggle and initialization
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    // Toggle the theme
    document.body.classList.toggle('dark-theme');
    
    // Check if we're currently in dark theme after toggling
    const isNowDarkTheme = document.body.classList.contains('dark-theme');
    const newTheme = isNowDarkTheme ? 'dark' : 'light';
    
    // Save the theme setting
    window.electronAPI.setTheme(newTheme)
        .catch(err => console.error('Error saving theme:', err));
    
    // Notify settings window if it's open (will be handled in main.js)
    window.electronAPI.syncTheme(newTheme);
    
    // Update button to show what it would switch to (not the current theme)
    const nextTheme = isNowDarkTheme ? 'Light' : 'Dark';
    const nextIcon = isNowDarkTheme ? 'fa-sun' : 'fa-moon';
    
    themeToggle.innerHTML = `<i class="fas ${nextIcon}"></i> Theme: ${nextTheme}`;
});

// Update the settings button to open the separate settings window
const settingsButton = document.querySelector('#optionsMenu .menu-item:nth-child(3)');
settingsButton.addEventListener('click', () => {
    // Close options menu first
    optionsMenu.style.display = 'none';
    
    // Open the settings window via IPC
    window.electronAPI.openSettings();
});

// Function to load folder button preferences
function loadFolderButtonPreferences() {
    window.electronAPI.getFolderPreferences()
        .then(prefs => {
            // If no preferences are set yet, use default (app folders)
            if (!prefs) {
                prefs = {
                    folderType: 'app',  // Default to app folders
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
            
            // Apply folder button visibility
            updateFolderButtonVisibility(prefs);
        })
        .catch(err => {
            console.error('Error loading folder preferences:', err);
        });
}

// Function to update folder button visibility based on settings
function updateFolderButtonVisibility(prefs) {
    // Show the correct folder set
    const appFoldersContainer = document.querySelector('.folder-buttons.app-folders');
    const windowsFoldersContainer = document.querySelector('.folder-buttons.windows-folders');
    
    if (prefs.folderType === 'app') {
        appFoldersContainer.style.display = 'flex';
        windowsFoldersContainer.style.display = 'none';
    } else {
        appFoldersContainer.style.display = 'none';
        windowsFoldersContainer.style.display = 'flex';
    }
    
    // Set individual button visibility for app folders
    for (const folder in prefs.appFolders) {
        const button = document.getElementById(`app${folder.charAt(0).toUpperCase() + folder.slice(1)}`);
        if (button) {
            button.style.display = prefs.appFolders[folder] ? 'flex' : 'none';
        }
    }
    
    // Set individual button visibility for Windows folders
    for (const folder in prefs.windowsFolders) {
        const button = document.getElementById(`win${folder.charAt(0).toUpperCase() + folder.slice(1)}`);
        if (button) {
            button.style.display = prefs.windowsFolders[folder] ? 'flex' : 'none';
        }
    }
}

// Function to load categories into the select elements
function loadCategories() {
    console.log('Loading categories...');
    window.electronAPI.getCategories().then(categories => {
        console.log('Categories loaded:', categories);
        // Get the category select elements
        const addCategorySelect = document.getElementById('appCategory');
        const editCategorySelect = document.getElementById('editAppCategory');
        
        // Clear existing options (keeping the default "Select a category" option)
        while (addCategorySelect.options.length > 1) {
            addCategorySelect.remove(1);
        }
        
        while (editCategorySelect.options.length > 1) {
            editCategorySelect.remove(1);
        }
        
        // Add category options to both select elements
        categories.forEach(category => {
            console.log('Adding category option:', category);
            // Add to 'Add App' dialog
            const addOption = document.createElement('option');
            addOption.value = category.id; // Use category ID as value
            addOption.textContent = category.name; // Use category name as text
            addCategorySelect.appendChild(addOption);
            
            // Add to 'Edit App' dialog
            const editOption = document.createElement('option');
            editOption.value = category.id; // Use category ID as value
            editOption.textContent = category.name; // Use category name as text
            editCategorySelect.appendChild(editOption);
        });
    }).catch(err => {
        console.error('Error loading categories:', err);
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadApplications();
    loadDriveInfo();
    loadFolderButtonPreferences();
    loadCategories(); // Add this call to load categories when the app starts
    
    // Load saved font size
    window.electronAPI.getFontSize()
        .then(fontSize => {
            // Apply font size to app table
            const appTable = document.querySelector('.app-table');
            if (appTable && fontSize) {
                appTable.style.fontSize = `${fontSize}px`;
            }
        })
        .catch(err => {
            console.error('Error loading font size:', err);
        });
    
    // Add New App button event listener
    document.getElementById('addAppButton').addEventListener('click', () => {
        // Close apps menu
        appsMenu.style.display = 'none';
        
        // Show the add app dialog
        document.getElementById('addAppDialog').style.display = 'block';
    });
    
    // Add App Dialog close button handler
    document.getElementById('closeAddAppDialog').addEventListener('click', () => {
        document.getElementById('addAppDialog').style.display = 'none';
    });
    
    // Add App Dialog cancel button handler
    document.getElementById('cancelAddApp').addEventListener('click', () => {
        document.getElementById('addAppDialog').style.display = 'none';
    });
    
    // Browse executable button handler
    document.getElementById('browseExecutable').addEventListener('click', () => {
        window.electronAPI.openFileDialog().then(filePath => {
            if (filePath) {
                document.getElementById('executablePath').value = filePath;
            }
        }).catch(err => {
            console.error('Error opening file dialog:', err);
        });
    });
    
    // Save new app button handler
    document.getElementById('saveApp').addEventListener('click', () => {
        // Get values from the form
        const name = document.getElementById('appName').value;
        const executable_path = document.getElementById('executablePath').value;
        const category = document.getElementById('appCategory').value;
        const description = document.getElementById('appDescription').value;
        const is_favorite = document.getElementById('isFavorite').checked;
        const is_portable = document.querySelector('input[name="appType"]:checked').value === 'portable';
        
        // Validate form
        if (!name || !executable_path) {
            // Show error message
            alert('Application name and executable path are required.');
            return;
        }
        
        // Create app object
        const newApp = {
            name,
            executable_path,
            category,
            description,
            is_favorite,
            is_portable
        };
        
        // Add the app
        window.electronAPI.addApp(newApp).then(() => {
            // Close the dialog
            document.getElementById('addAppDialog').style.display = 'none';
            
            // Clear the form
            document.getElementById('appName').value = '';
            document.getElementById('executablePath').value = '';
            document.getElementById('appCategory').value = '';
            document.getElementById('appDescription').value = '';
            document.getElementById('isFavorite').checked = false;
            
            // Reload the application list
            loadApplications();
        }).catch(err => {
            console.error('Error adding app:', err);
            alert('Failed to add application. Please try again.');
        });
    });
    
    // Load saved theme
    window.electronAPI.getTheme()
        .then(theme => {
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i> Theme: Light';
            }
        })
        .catch(err => {
            console.error('Error loading theme:', err);
        });
    
    // Listen for theme changes from the settings window
    window.electronAPI.onThemeChanged((theme) => {
        // Update visual state in the main app
        const isDarkTheme = theme === 'dark';
        document.body.classList.toggle('dark-theme', isDarkTheme);
        
        // Update button to show what it would switch to (not the current theme)
        const nextTheme = isDarkTheme ? 'Light' : 'Dark';
        const nextIcon = isDarkTheme ? 'fa-sun' : 'fa-moon';
        
        themeToggle.innerHTML = `<i class="fas ${nextIcon}"></i> Theme: ${nextTheme}`;
    });
    
    // Listen for folder preferences changes from the settings window
    window.electronAPI.onFolderPreferencesChanged((folderSettings) => {
        updateFolderButtonVisibility(folderSettings);
    });
    
    // Listen for font size changes from the settings window
    window.electronAPI.onFontSizeChanged((size) => {
        // Update the app-table font size in real-time
        const appTable = document.querySelector('.app-table');
        if (appTable) {
            appTable.style.fontSize = `${size}px`;
        }
    });
    
    // Set up interval to refresh drive info every minute
    setInterval(loadDriveInfo, 60000);
});