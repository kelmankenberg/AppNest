// Load applications from the database
function loadApplications() {
    window.electronAPI.getAllApps().then(apps => {
        // Apply sorting before displaying applications
        const sortPreference = localStorage.getItem('appnest-sort-preference') || 'alphabetical';
        const sortedApps = sortApplications(apps, sortPreference);
        displayApplications(sortedApps);
    }).catch(err => {
        console.error('Error loading applications:', err);
    });
}

// Expose the loadApplications function to the window object
window.loadApplications = loadApplications;

// Function to sort applications based on the selected sort option
function sortApplications(apps, sortType) {
    // Make a copy of the apps array to avoid modifying the original
    const appsCopy = [...apps];
    
    switch (sortType) {
        case 'alphabetical':
            // Sort alphabetically by name
            return appsCopy.sort((a, b) => a.name.localeCompare(b.name));
            
        case 'favorites':
            // Sort by favorites first, then alphabetically within each group
            return appsCopy.sort((a, b) => {
                // If both apps have the same favorite status, sort alphabetically
                if ((a.is_favorite && b.is_favorite) || (!a.is_favorite && !b.is_favorite)) {
                    return a.name.localeCompare(b.name);
                }
                // Otherwise, favorites come first
                return a.is_favorite ? -1 : 1;
            });
            
        case 'categories':
            // Sort by category name, then by app name within each category
            return appsCopy.sort((a, b) => {
                // Get category names (or empty string if null)
                const catA = a.category_name || '';
                const catB = b.category_name || '';
                
                // First sort by category
                const catCompare = catA.localeCompare(catB);
                
                // If categories are the same, sort by app name
                if (catCompare === 0) {
                    return a.name.localeCompare(b.name);
                }
                
                return catCompare;
            });
            
        case 'most-used':
            // Sort by launch count (descending), then alphabetically
            return appsCopy.sort((a, b) => {
                const launchA = a.launch_count || 0;
                const launchB = b.launch_count || 0;
                
                // Sort by launch count descending
                if (launchA !== launchB) {
                    return launchB - launchA;
                }
                
                // If launch counts are equal, sort alphabetically
                return a.name.localeCompare(b.name);
            });
            
        case 'installation-type':
            // Sort portable apps first, then installed apps (both alphabetically)
            return appsCopy.sort((a, b) => {
                // If both apps are of the same type, sort alphabetically
                if ((a.is_portable && b.is_portable) || (!a.is_portable && !b.is_portable)) {
                    return a.name.localeCompare(b.name);
                }
                // Otherwise, portable apps come first
                return a.is_portable ? -1 : 1;
            });
            
        default:
            // Default to alphabetical sort
            return appsCopy.sort((a, b) => a.name.localeCompare(b.name));
    }
}

// Expose the sortApplications function to the window object
window.sortApplications = sortApplications;

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
    
    // Get the icon size from the settings, or use default 20px
    window.electronAPI.getIconSize().then(iconSize => {
        // Convert to number if it's a string
        const iconSizeNum = parseInt(iconSize);
        
        apps.forEach(app => {
            const row = document.createElement('tr');
            row.className = 'app-row';
            row.dataset.appId = app.id;
            
            // Create app name cell with icon
            const nameCell = document.createElement('td');
            nameCell.className = 'app-cell';
            
            // Create icon container
            const iconContainer = document.createElement('div');
            iconContainer.className = 'app-icon-container';
            iconContainer.style.width = `${iconSizeNum}px`;
            iconContainer.style.height = `${iconSizeNum}px`;
            
            // Check for icon (either icon_data or icon_path)
            let hasIcon = false;
            
            // Create icon element
            const icon = document.createElement('img');
            icon.className = 'app-icon';
            icon.style.width = `${iconSizeNum}px`;
            icon.style.height = `${iconSizeNum}px`;
            
            if (app.icon_data) {
                // If we have base64 icon data, use it
                icon.src = app.icon_data;
                hasIcon = true;
            } else if (app.icon_path) {
                // If we have an icon path, use it with the file:// protocol
                icon.src = `file://${app.icon_path}`;
                hasIcon = true;
                
                // Add error handler in case the icon file can't be loaded
                icon.onerror = () => {
                    console.warn(`Failed to load icon for ${app.name} from path: ${app.icon_path}`);
                    icon.style.display = 'none';
                    
                    // Create fallback icon with first letter if icon fails to load
                    if (!iconContainer.querySelector('.app-icon-fallback')) {
                        const fallbackIcon = document.createElement('div');
                        fallbackIcon.className = 'app-icon-fallback';
                        fallbackIcon.textContent = app.name.charAt(0).toUpperCase();
                        fallbackIcon.style.width = `${iconSizeNum}px`;
                        fallbackIcon.style.height = `${iconSizeNum}px`;
                        fallbackIcon.style.fontSize = `${Math.round(iconSizeNum * 0.6)}px`;
                        fallbackIcon.style.lineHeight = `${iconSizeNum}px`;
                        iconContainer.appendChild(fallbackIcon);
                    }
                };
            }
            
            // If we found an icon (path or data), add it
            if (hasIcon) {
                iconContainer.appendChild(icon);
            } else {
                // Create fallback icon with first letter
                const fallbackIcon = document.createElement('div');
                fallbackIcon.className = 'app-icon-fallback';
                fallbackIcon.textContent = app.name.charAt(0).toUpperCase();
                fallbackIcon.style.width = `${iconSizeNum}px`;
                fallbackIcon.style.height = `${iconSizeNum}px`;
                fallbackIcon.style.fontSize = `${Math.round(iconSizeNum * 0.6)}px`;
                fallbackIcon.style.lineHeight = `${iconSizeNum}px`;
                iconContainer.appendChild(fallbackIcon);
            }
            
            nameCell.appendChild(iconContainer);
            
            // Create the app name container to allow space for the favorite star
            const nameContainer = document.createElement('div');
            nameContainer.className = 'app-name-container';
            
            // Add app name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'app-name';
            nameSpan.textContent = app.name;
            nameContainer.appendChild(nameSpan);
            
            // Add favorite indicator if app is marked as favorite
            if (app.is_favorite) {
                const favoriteIcon = document.createElement('div');
                favoriteIcon.className = 'favorite-indicator';
                // Add inline style to the icon element
                favoriteIcon.innerHTML = '<i class="fas fa-star" style="font-size: 10px;"></i>';
                nameContainer.appendChild(favoriteIcon);
            }
            
            nameCell.appendChild(nameContainer);
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
        
        console.log(`Applied icon size of ${iconSizeNum}px to ${apps.length} application icons`);
    }).catch(error => {
        console.error("Error getting icon size:", error);
        // If there's an error, just use default styling from CSS
        console.log("Using default icon styling due to error");
    });
}

// Expose the displayApplications function to the window object
window.displayApplications = displayApplications;

// Apply the selected sort option - exposed for menu.js
window.applySortOption = function(sortValue) {
    console.log(`Applying sort option from window function: ${sortValue}`);
    
    // Save the user's preference to localStorage for persistence in the current window
    localStorage.setItem('appnest-sort-preference', sortValue);
    
    // Also save to electron-store so it persists between app restarts and syncs with settings
    window.electronAPI.setDefaultView(sortValue)
        .then(() => {
            console.log(`Default view preference saved: ${sortValue}`);
            // Sync with settings window if it's open
            window.electronAPI.syncDefaultView(sortValue);
        })
        .catch(err => console.error('Error saving default view preference:', err));
    
    // Apply the sorting immediately to the current app list
    const apps = window.appData?.apps || [];
    if (apps.length > 0) {
        const sortedApps = sortApplications(apps, sortValue);
        displayApplications(sortedApps);
    } else {
        // If apps aren't loaded yet, just reload applications using the sort preference
        loadApplications();
    }
    
    // Show a visual indicator that sorting has been applied
    showSortingNotification(sortValue);
};

// Show a brief notification when sorting is applied
function showSortingNotification(sortValue) {
    // Map sort values to user-friendly names
    const sortNames = {
        'alphabetical': 'Alphabetical',
        'categories': 'Categories', 
        'favorites': 'Favorites',
        'most-used': 'Most Used',
        'installation-type': 'Portable/Installed'
    };
    
    // Create notification element if it doesn't exist
    let notification = document.getElementById('sort-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'sort-notification';
        notification.className = 'sort-notification';
        document.body.appendChild(notification);
    }
    
    // Set notification text and show it
    notification.textContent = `Sorted by: ${sortNames[sortValue] || sortValue}`;
    notification.classList.add('show');
    
    // Hide notification after a delay
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
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
            if (editDescriptionElem) editDescriptionElem.value = app.description || '';
            
            // Update favorite star state
            const editFavoriteStar = document.getElementById('editFavoriteStar');
            const editIsFavoriteInput = document.getElementById('editIsFavorite');
            if (editFavoriteStar && editIsFavoriteInput) {
                const isFavorite = app.is_favorite || false;
                editIsFavoriteInput.value = isFavorite ? '1' : '0';
                editFavoriteStar.className = isFavorite ? 'fas fa-star favorite-star' : 'far fa-star favorite-star';
                if (isFavorite) {
                    editFavoriteStar.style.color = '#ffd700';
                    editFavoriteStar.title = 'Remove from favorites';
                } else {
                    editFavoriteStar.style.color = '';
                    editFavoriteStar.title = 'Add to favorites';
                }
            }
            
            // Set the app type radio button
            const appTypeRadios = document.getElementsByName('editAppType');
            for (let radio of appTypeRadios) {
                radio.checked = (radio.value === (app.is_portable ? 'portable' : 'installed'));
            }
            
            // Store the app ID in the hidden field
            const editAppIdElem = document.getElementById('editAppId');
            if (editAppIdElem) editAppIdElem.value = app.id;
            
            // Update icon preview
            updateEditAppIcon(app);
            
            // Show the edit dialog
            const editDialog = document.getElementById('editAppDialog');
            if (editDialog) {
                // Force the dialog to be visible and on top
                editDialog.style.display = 'block';
                editDialog.style.zIndex = '2000';
            }
        } else {
            console.error('App data not found for ID:', appId);
        }
    }).catch(err => {
        console.error('Error getting app details:', err);
    });
});

// Function to update icon preview in the edit dialog
function updateEditAppIcon(app) {
    const iconContainer = document.getElementById('editAppIconContainer');
    const refreshIcon = document.getElementById('editIconRefresh');
    
    if (!iconContainer) return;
    
    // Clear previous content except the refresh button
    while (iconContainer.firstChild) {
        if (iconContainer.firstChild !== refreshIcon) {
            iconContainer.removeChild(iconContainer.firstChild);
        } else {
            // Just move the refresh button to the side temporarily
            iconContainer.removeChild(refreshIcon);
            break;
        }
    }
    
    // Add the refresh button back
    iconContainer.appendChild(refreshIcon);
    
    // Set the hidden icon path input
    const iconPathInput = document.getElementById('editAppIconPath');
    if (iconPathInput) {
        iconPathInput.value = app.icon_path || '';
    }
    
    let hasIcon = false;
    
    // Check if app has an icon (icon_data or icon_path)
    if (app.icon_data || app.icon_path) {
        // Create image element for the icon
        const iconImg = document.createElement('img');
        iconImg.className = 'app-icon-img';
        iconImg.alt = '';
        iconImg.style.width = '100%';
        iconImg.style.height = '100%';
        iconImg.style.objectFit = 'contain';
        
        // Set up error handling for image load
        iconImg.onerror = () => {
            console.error('Failed to load icon image');
            hasIcon = false;
            // Make the refresh button visible
            refreshIcon.classList.add('active');
            // Remove the failed image
            if (iconContainer.contains(iconImg)) {
                iconContainer.removeChild(iconImg);
            }
        };
        
        // Set the image source based on available data
        if (app.icon_data) {
            iconImg.src = app.icon_data;
            hasIcon = true;
        } else if (app.icon_path) {
            iconImg.src = `file://${app.icon_path}`;
            hasIcon = true;
        }
        
        // If we have an icon, add it to the container
        if (hasIcon) {
            iconContainer.insertBefore(iconImg, refreshIcon);
            refreshIcon.classList.remove('active'); // Hide refresh button when icon exists
        } else {
            refreshIcon.classList.add('active');  // Show refresh button when no icon
        }
    } else {
        // No icon available, show the refresh button
        refreshIcon.classList.add('active');
    }
}

// Add event listener for the icon refresh button
document.getElementById('editIconRefresh').addEventListener('click', () => {
    const executablePath = document.getElementById('editExecutablePath').value;
    
    if (!executablePath) {
        alert('Please enter an executable path to extract an icon from.');
        return;
    }
    
    // Show loading state
    const refreshIcon = document.getElementById('editIconRefresh');
    const originalHTML = refreshIcon.innerHTML;
    refreshIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Call the extractIcon API
    window.electronAPI.extractIcon(executablePath).then(result => {
        if (result && result.icon_path) {
            // Update the hidden icon path field
            const iconPathInput = document.getElementById('editAppIconPath');
            if (iconPathInput) {
                iconPathInput.value = result.icon_path;
            }
            
            // Create a mock app object to update the icon
            const mockApp = {
                icon_path: result.icon_path,
                name: document.getElementById('editAppName').value
            };
            
            // Update the icon preview
            updateEditAppIcon(mockApp);
        } else {
            alert('Could not extract icon from the specified executable.');
        }
    }).catch(err => {
        console.error('Error extracting icon:', err);
        alert('Error extracting icon. Please make sure the path is correct.');
    }).finally(() => {
        // Restore the refresh icon
        refreshIcon.innerHTML = originalHTML;
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
    window.electronAPI.openFileDialog().then(result => {
        if (result) {
            // Set the executable path
            document.getElementById('editExecutablePath').value = result.path;
            
            // If we got an application name and the name field is empty, set it
            const appNameField = document.getElementById('editAppName');
            if (result.name && (!appNameField.value || appNameField.value.trim() === '')) {
                appNameField.value = result.name;
            }
            
            // If we got a description and the description field is empty, set it
            const descriptionField = document.getElementById('editAppDescription');
            if (result.description && (!descriptionField.value || descriptionField.value.trim() === '')) {
                descriptionField.value = result.description;
            }
            
            // If we got an icon, display it in the icon container
            if (result.icon_path) {
                const iconContainer = document.getElementById('editAppIconContainer');
                if (iconContainer) {
                    // Clear previous content
                    iconContainer.innerHTML = '';
                    
                    // Create image element for the icon
                    const iconImg = document.createElement('img');
                    iconImg.className = 'app-icon-img';
                    iconImg.alt = '';
                    iconImg.style.width = '100%';
                    iconImg.style.height = '100%';
                    iconImg.style.objectFit = 'contain';
                    
                    // Set up error handling for the image load
                    iconImg.onerror = () => {
                        console.error('Failed to load icon image');
                        // Fallback to first letter of app name
                        const appName = appNameField.value || result.name;
                        const letter = appName ? appName.charAt(0).toUpperCase() : 'A';
                        
                        // Create SVG fallback
                        iconContainer.innerHTML = `<svg class="icon-svg" viewBox="0 0 32 32">
                            <rect width="32" height="32" fill="#a8a8a8"></rect>
                            <text x="50%" y="50%" font-size="16" text-anchor="middle" 
                                 dominant-baseline="middle" fill="white">${letter}</text>
                        </svg>`;
                    };
                    
                    // Set the image source to the extracted icon
                    iconImg.src = `file://${result.icon_path}`;
                    
                    // Add the image to the container
                    iconContainer.appendChild(iconImg);
                    
                    // Create a hidden input to store the icon path
                    let iconPathInput = document.getElementById('editAppIconPath');
                    if (!iconPathInput) {
                        iconPathInput = document.createElement('input');
                        iconPathInput.type = 'hidden';
                        iconPathInput.id = 'editAppIconPath';
                        document.getElementById('editAppForm').appendChild(iconPathInput);
                    }
                    iconPathInput.value = result.icon_path;
                }
            }
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
    const category_id_raw = document.getElementById('editAppCategory').value;
    // Convert empty string to null, or parse selected category ID as integer
    const category_id = category_id_raw === '' ? null : parseInt(category_id_raw);
    const description = document.getElementById('editAppDescription').value;
    const is_favorite = document.getElementById('editIsFavorite').value === '1';
    const is_portable = document.querySelector('input[name="editAppType"]:checked').value === 'portable';
    const icon_path = document.getElementById('editAppIconPath')?.value || null;
    
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
        is_portable,
        icon_path: icon_path // Include the icon path when updating
    };
    
    console.log('Updating app with data:', updatedApp);
    
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
    // Get the current minimize-on-power-button setting
    window.electronAPI.getMinimizeOnPowerButton()
        .then(minimizeEnabled => {
            if (minimizeEnabled) {
                // If the setting is enabled, minimize the app instead of quitting
                window.electronAPI.minimizeApp();
            } else {
                // Otherwise use the default behavior: quit the app
                window.electronAPI.quitApp();
            }
        })
        .catch(err => {
            console.error('Error checking minimize-on-power-button setting:', err);
            // Default to quitting if there's an error
            window.electronAPI.quitApp();
        });
});

// Listen for minimize-on-power-button setting changes from settings window
window.electronAPI.onMinimizeOnPowerButtonChanged((enabled) => {
    updatePowerButtonIcon(enabled);
});

// Function to update the power button icon based on the minimize-on-power-button setting
function updatePowerButtonIcon(minimizeEnabled) {
    const powerButton = document.querySelector('button[title="Power"], button[title="Minimize"]');
    
    if (powerButton) {
        console.log(`Updating power button icon. Minimize enabled: ${minimizeEnabled}`);
        
        if (minimizeEnabled === true) {
            // Change icon to minimize icon when the setting is enabled
            powerButton.innerHTML = '<i class="fas fa-window-minimize"></i>';
            powerButton.title = "Minimize";
            console.log('Set to minimize icon');
        } else {
            // Use the default power icon when the setting is disabled (quit behavior)
            powerButton.innerHTML = '<i class="fas fa-power-off"></i>';
            powerButton.title = "Power";
            console.log('Set to power icon');
        }
    } else {
        console.error('Power button element not found');
    }
}

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
        mainDriveCircle.style.cursor = 'pointer';
        
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
        
        // Add click event to open the drive
        mainDriveCircle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent panel toggle
            window.electronAPI.openFolder('windows', systemDrive.letter.charAt(0).toLowerCase());
        });
        
        // Create main drive display with expand icon
        const mainDrive = document.createElement('div');
        mainDrive.className = 'main-drive';
        mainDrive.appendChild(mainDriveCircle);
        
        // Add expand icon
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        expandIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Only trigger panel toggle
            toggleDrivePanel();
        });
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
    driveCircle.style.cursor = 'pointer';
    
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
    
    // Add click event to open the drive in the system file manager
    driveCircle.addEventListener('click', () => {
        window.electronAPI.openFolder('windows', drive.letter.charAt(0).toLowerCase());
    });

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
            
            // Make sure both folder types have all required properties
            prefs.appFolders = prefs.appFolders || {};
            prefs.windowsFolders = prefs.windowsFolders || {};
            
            // Ensure all properties exist (in case of partial preferences)
            const folderTypes = ['documents', 'music', 'pictures', 'videos', 'downloads'];
            folderTypes.forEach(type => {
                if (typeof prefs.appFolders[type] === 'undefined') {
                    prefs.appFolders[type] = true; // Default to visible
                }
                if (typeof prefs.windowsFolders[type] === 'undefined') {
                    prefs.windowsFolders[type] = true; // Default to visible
                }
            });
            
            console.log('Loaded folder preferences:', prefs);
            
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
    const folderHeader = document.getElementById('folderHeader');
    
    if (prefs.folderType === 'app') {
        appFoldersContainer.classList.add('active');
        windowsFoldersContainer.classList.remove('active');
        folderHeader.textContent = 'App Folders';
    } else {
        appFoldersContainer.classList.remove('active');
        windowsFoldersContainer.classList.add('active');
        folderHeader.textContent = 'User Folders';
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

// Folder toggle button functionality
document.getElementById('folderToggleBtn').addEventListener('click', () => {
    const folderHeader = document.getElementById('folderHeader');
    const appFolders = document.querySelector('.folder-buttons.app-folders');
    const windowsFolders = document.querySelector('.folder-buttons.windows-folders');
    const toggleButton = document.getElementById('folderToggleBtn');
    
    // Toggle the active class on the button for rotation animation
    toggleButton.classList.toggle('active');
    
    // First, get the current preferences to preserve folder visibility settings
    window.electronAPI.getFolderPreferences()
        .then(currentPrefs => {
            // If we don't have current preferences, create defaults
            if (!currentPrefs) {
                currentPrefs = {
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
            
            // Check which folders are currently active and switch
            if (appFolders.classList.contains('active')) {
                // Switch to Windows User Folders
                appFolders.classList.remove('active');
                windowsFolders.classList.add('active');
                folderHeader.textContent = 'User Folders';
                
                // Update folder type but preserve folder visibility settings
                currentPrefs.folderType = 'windows';
            } else {
                // Switch to App Folders
                windowsFolders.classList.remove('active');
                appFolders.classList.add('active');
                folderHeader.textContent = 'App Folders';
                
                // Update folder type but preserve folder visibility settings
                currentPrefs.folderType = 'app';
            }
            
            // Save the complete preferences object
            window.electronAPI.setFolderPreferences(currentPrefs)
                .then(() => {
                    console.log('Folder preferences saved successfully:', currentPrefs);
                })
                .catch(err => console.error('Error saving folder preference:', err));
        })
        .catch(err => {
            console.error('Error getting current folder preferences:', err);
        });
});

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

// Apply search bar styles based on configuration
async function applySearchBarStyles() {
    try {
        // Get the search input element
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) {
            console.warn('Search input element not found');
            return;
        }
        
        // Get style configuration from main process
        const style = await window.api.getSearchbarStyle();
        console.log('Applying search bar styles:', style);
        
        // Apply style using direct DOM manipulation to override any existing styles
        // Remove all borders first
        searchInput.style.border = 'none';
        
        // Conditionally apply borders based on configuration
        if (style.borderTop) searchInput.style.borderTop = '1px solid var(--border-color, #ccc)';
        if (style.borderRight) searchInput.style.borderRight = '1px solid var(--border-color, #ccc)';
        if (style.borderBottom) searchInput.style.borderBottom = '1px solid var(--border-color, #ccc)';
        if (style.borderLeft) searchInput.style.borderLeft = '1px solid var(--border-color, #ccc)';
        
        // Apply minimized state if configured
        if (style.minimized) {
            searchInput.classList.add('minimized');
        } else {
            searchInput.classList.remove('minimized');
        }
    } catch (error) {
        console.error('Error applying search bar styles:', error);
    }
}

// Global store for app data
window.appData = {
    apps: [],
    categories: []
};

// Function to load all apps
async function loadAllApps() {
    try {
        if (!window.api || !window.api.getAllApps) {
            console.error('API not available for loading apps');
            return;
        }
        
        // Load apps from API
        const apps = await window.api.getAllApps();
        console.log(`Loaded ${apps.length} apps`);
        
        // Store apps in global data
        window.appData.apps = apps;
        
        // Display apps in app table
        updateAppTable(apps);
        
        // Dispatch event to notify other modules
        const event = new CustomEvent('apps-loaded', { detail: apps });
        window.dispatchEvent(event);
        
        return apps;
    } catch (error) {
        console.error('Error loading apps:', error);
        return [];
    }
}

// Toggle favorite status with star icon
const favoriteStar = document.getElementById('favoriteStar');
const isFavoriteInput = document.getElementById('isFavorite');

// Initialize star icon state
function updateStarIcon(isFavorite) {
    if (isFavorite) {
        favoriteStar.classList.remove('far');
        favoriteStar.classList.add('fas');
        favoriteStar.title = 'Remove from favorites';
    } else {
        favoriteStar.classList.remove('fas');
        favoriteStar.classList.add('far');
        favoriteStar.title = 'Add to favorites';
    }
}

// Handle star click
favoriteStar.addEventListener('click', function() {
    const isFavorite = isFavoriteInput.value === '1';
    isFavoriteInput.value = isFavorite ? '0' : '1';
    updateStarIcon(!isFavorite);
});

// Function to clear the add app form
function clearAddAppForm() {
    document.getElementById('appName').value = '';
    document.getElementById('executablePath').value = '';
    document.getElementById('appCategory').value = '';
    document.getElementById('appDescription').value = '';
    document.querySelector('input[name="appType"]:checked').checked = true;
    document.getElementById('isFavorite').value = '0';
    document.getElementById('appIconPath').value = '';
    document.getElementById('appIcon').innerHTML = '<rect width="32" height="32" fill="#a8a8a8"/>';
    updateStarIcon(false);
}

// Toggle favorite status with star icon in edit dialog
const editFavoriteStar = document.getElementById('editFavoriteStar');
const editIsFavoriteInput = document.getElementById('editIsFavorite');

// Handle star click in edit dialog
if (editFavoriteStar && editIsFavoriteInput) {
    editFavoriteStar.addEventListener('click', function() {
        const isFavorite = editIsFavoriteInput.value === '1';
        editIsFavoriteInput.value = isFavorite ? '0' : '1';
        
        // Update star appearance
        if (isFavorite) {
            editFavoriteStar.className = 'far fa-star favorite-star';
            editFavoriteStar.style.color = '';
            editFavoriteStar.title = 'Add to favorites';
        } else {
            editFavoriteStar.className = 'fas fa-star favorite-star';
            editFavoriteStar.style.color = '#ffd700';
            editFavoriteStar.title = 'Remove from favorites';
        }
    });
}

// Add App Dialog close button handler
document.getElementById('closeAddAppDialog').addEventListener('click', () => {
    document.getElementById('addAppDialog').style.display = 'none';
    clearAddAppForm();
});

// Add App Dialog cancel button handler
document.getElementById('cancelAddApp').addEventListener('click', () => {
    document.getElementById('addAppDialog').style.display = 'none';
    clearAddAppForm();
});

// Add New App button event listener
document.getElementById('addAppMenuItem').addEventListener('click', () => {
    // Close apps menu
    appsMenu.style.display = 'none';
    
    // Clear the form before showing it
    clearAddAppForm();
    
    // Show the add app dialog
    document.getElementById('addAppDialog').style.display = 'block';
});

// Add Escape key handler for Add New App dialog
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.getElementById('addAppDialog').style.display === 'block') {
        document.getElementById('addAppDialog').style.display = 'none';
        clearAddAppForm();
    }
});

// Listen for Ctrl+Shift+A shortcut from main process
window.electronAPI.onShowAddAppDialog(() => {
    // Close apps menu if open
    if (appsMenu) {
        appsMenu.style.display = 'none';
    }
    
    // Clear the form before showing it
    clearAddAppForm();
    
    // Show the add app dialog
    document.getElementById('addAppDialog').style.display = 'block';
});

// Browse executable button handler
document.getElementById('browseExecutable').addEventListener('click', () => {
    window.electronAPI.openFileDialog().then(result => {
        if (result) {
            // Set the executable path
            document.getElementById('executablePath').value = result.path;
            
            // If we got an application name and the name field is empty, set it
            const appNameField = document.getElementById('appName');
            if (result.name && (!appNameField.value || appNameField.value.trim() === '')) {
                appNameField.value = result.name;
            }
            
            // If we got a description and the description field is empty, set it
            const descriptionField = document.getElementById('appDescription');
            if (result.description && (!descriptionField.value || descriptionField.value.trim() === '')) {
                descriptionField.value = result.description;
            }
            
            // If we got an icon, display it in the icon container
            if (result.icon_path) {
                const iconContainer = document.getElementById('appIconContainer');
                if (iconContainer) {
                    // Clear previous content
                    iconContainer.innerHTML = '';
                    
                    // Create image element for the icon
                    const iconImg = document.createElement('img');
                    iconImg.className = 'app-icon-img';
                    iconImg.alt = '';
                    iconImg.style.width = '100%';
                    iconImg.style.height = '100%';
                    iconImg.style.objectFit = 'contain';
                    
                    // Set up error handling for the image load
                    iconImg.onerror = () => {
                        console.error('Failed to load icon image');
                        // Fallback to first letter of app name
                        const appName = appNameField.value || result.name;
                        const letter = appName ? appName.charAt(0).toUpperCase() : 'A';
                        
                        // Create SVG fallback
                        iconContainer.innerHTML = `<svg class="icon-svg" viewBox="0 0 32 32">
                            <rect width="32" height="32" fill="#a8a8a8"></rect>
                            <text x="50%" y="50%" font-size="16" text-anchor="middle" 
                                 dominant-baseline="middle" fill="white">${letter}</text>
                        </svg>`;
                    };
                    
                    // Set the image source to the extracted icon
                    iconImg.src = `file://${result.icon_path}`;
                    
                    // Add the image to the container
                    iconContainer.appendChild(iconImg);
                    
                    // Create a hidden input to store the icon path
                    let iconPathInput = document.getElementById('appIconPath');
                    if (!iconPathInput) {
                        iconPathInput = document.createElement('input');
                        iconPathInput.type = 'hidden';
                        iconPathInput.id = 'appIconPath';
                        document.getElementById('addAppForm').appendChild(iconPathInput);
                    }
                    iconPathInput.value = result.icon_path;
                }
            }
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
    const is_favorite = document.getElementById('isFavorite').value === '1';
    const is_portable = document.querySelector('input[name="appType"]:checked').value === 'portable';
    const icon_path = document.getElementById('appIconPath')?.value || null;
    
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
        category_id: category ? parseInt(category) : null,
        description,
        is_favorite,
        is_portable,
        icon_path: icon_path // Use the extracted icon path
    };
    
    // Add the app
    window.electronAPI.addApp(newApp).then(() => {
        // Close the dialog
        document.getElementById('addAppDialog').style.display = 'none';
        
        // Clear the form
        clearAddAppForm();
        
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
window.electronAPI.onFontSizeChanged((size, iconSize) => {
    // Update the app-table font size in real-time
    const appTable = document.querySelector('.app-table');
    if (appTable) {
        appTable.style.fontSize = `${size}px`;
    }
    
    // If iconSize is not provided, calculate it based on font size
    if (!iconSize) {
        iconSize = calculateIconSize(parseInt(size));
    }
    
    // Update icon size for all app icons
    const appIcons = document.querySelectorAll('.app-icon');
    appIcons.forEach(icon => {
        icon.style.width = `${iconSize}px`;
        icon.style.height = `${iconSize}px`;
    });
    
    // Also update fallback icons
    const fallbackIcons = document.querySelectorAll('.app-icon-fallback');
    fallbackIcons.forEach(icon => {
        icon.style.width = `${iconSize}px`;
        icon.style.height = `${iconSize}px`;
        icon.style.fontSize = `${Math.round(iconSize * 0.6)}px`; // Adjust font size proportionally
        icon.style.lineHeight = `${iconSize}px`;
    });
    
    // Also update the icon containers
    const iconContainers = document.querySelectorAll('.app-icon-container');
    iconContainers.forEach(container => {
        container.style.width = `${iconSize}px`;
        container.style.height = `${iconSize}px`;
    });
    
    console.log(`Font size changed to ${size}px, icon size to ${iconSize}px`);
});

// Listen for style changes from settings window or other sources
window.api.onSearchbarStyleChanged((style) => {
    applySearchBarStyles();
});

// Handle folder button clicks - App Folders
document.getElementById('appDocuments').addEventListener('click', () => {
    window.electronAPI.openFolder('app', 'documents');
});

document.getElementById('appMusic').addEventListener('click', () => {
    window.electronAPI.openFolder('app', 'music');
});

document.getElementById('appPictures').addEventListener('click', () => {
    window.electronAPI.openFolder('app', 'pictures');
});

document.getElementById('appVideos').addEventListener('click', () => {
    window.electronAPI.openFolder('app', 'videos');
});

document.getElementById('appDownloads').addEventListener('click', () => {
    window.electronAPI.openFolder('app', 'downloads');
});

// Handle folder button clicks - Windows Folders
document.getElementById('winDocuments').addEventListener('click', () => {
    window.electronAPI.openFolder('windows', 'documents');
});

document.getElementById('winMusic').addEventListener('click', () => {
    window.electronAPI.openFolder('windows', 'music');
});

document.getElementById('winPictures').addEventListener('click', () => {
    window.electronAPI.openFolder('windows', 'pictures');
});

document.getElementById('winVideos').addEventListener('click', () => {
    window.electronAPI.openFolder('windows', 'videos');
});

document.getElementById('winDownloads').addEventListener('click', () => {
    window.electronAPI.openFolder('windows', 'downloads');
});

// Set up interval to refresh drive info every minute
setInterval(loadDriveInfo, 60000);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize folder header with default text in case preferences take time to load
    const folderHeader = document.getElementById('folderHeader');
    if (folderHeader) {
        folderHeader.textContent = 'App Folders'; // Default value
    }
    
    // Set up apps-updated event listener first
    setupAppsUpdatedListener();
    
    loadApplications();
    loadDriveInfo();
    loadFolderButtonPreferences();
    loadCategories();
    
    // Apply search bar styles when page loads
    applySearchBarStyles();
    
    // Initialize the power button icon based on minimize-on-power-button setting
    window.electronAPI.getMinimizeOnPowerButton()
        .then(minimizeEnabled => {
            updatePowerButtonIcon(minimizeEnabled);
        })
        .catch(err => {
            console.error('Error getting minimize-on-power-button setting:', err);
        });
    
    // Load saved font size and icon size
    Promise.all([
        window.electronAPI.getFontSize(),
        window.electronAPI.getIconSize()
    ])
    .then(([fontSize, iconSize]) => {
        console.log(`Loaded settings - Font size: ${fontSize}px, Icon size: ${iconSize}px`);
        
        // Apply font size to app table
        const appTable = document.querySelector('.app-table');
        if (appTable && fontSize) {
            appTable.style.fontSize = `${fontSize}px`;
        }
        
        // Apply icon size to all app icons
        if (iconSize) {
            // Convert to number if it's a string
            const iconSizeNum = parseInt(iconSize);
            
            // Update all app icons
            const appIcons = document.querySelectorAll('.app-icon');
            appIcons.forEach(icon => {
                icon.style.width = `${iconSizeNum}px`;
                icon.style.height = `${iconSizeNum}px`;
            });
            
            // Also update fallback icons
            const fallbackIcons = document.querySelectorAll('.app-icon-fallback');
            fallbackIcons.forEach(icon => {
                icon.style.width = `${iconSizeNum}px`;
                icon.style.height = `${iconSizeNum}px`;
                icon.style.fontSize = `${Math.round(iconSizeNum * 0.6)}px`; // Adjust font size proportionally
                icon.style.lineHeight = `${iconSizeNum}px`;
            });
            
            // Also update the icon containers
            const iconContainers = document.querySelectorAll('.app-icon-container');
            iconContainers.forEach(container => {
                container.style.width = `${iconSizeNum}px`;
                container.style.height = `${iconSizeNum}px`;
            });
        }
    })
    .catch(err => {
        console.error('Error loading font/icon size settings:', err);
    });
});

// Listen for apps-updated events that provide the new app list
let appsUpdatedCleanup = null;

function setupAppsUpdatedListener() {
    console.log('Setting up apps-updated listener');
    
    // Clean up existing listener if any
    if (appsUpdatedCleanup) {
        console.log('Cleaning up existing apps-updated listener');
        appsUpdatedCleanup();
    }
    
    // Set up new listener
    appsUpdatedCleanup = window.electronAPI.onAppsUpdated((apps) => {
        console.log('Main window received apps-updated event with apps:', apps.length);
        if (Array.isArray(apps)) {
            // Apply current sorting before displaying
            const sortPreference = localStorage.getItem('appnest-sort-preference') || 'alphabetical';
            const sortedApps = sortApplications(apps, sortPreference);
            
            // Update the UI immediately with the new apps
            displayApplications(sortedApps);
            
            // Store updated apps in global data
            window.appData = window.appData || {};
            window.appData.apps = apps;
        }
    });
}

// Re-establish listener when window is focused
window.addEventListener('focus', () => {
    console.log('Main window focused, re-establishing apps-updated listener');
    setupAppsUpdatedListener();
});

// Clean up listener when window is closed
window.addEventListener('beforeunload', () => {
    if (appsUpdatedCleanup) {
        console.log('Cleaning up apps-updated listener on window close');
        appsUpdatedCleanup();
    }
});

// Listen for app list refresh events (used as a fallback)
window.electronAPI.onRefreshApps(() => {
    console.log('Refresh apps event received');
    window.electronAPI.getAllApps()
        .then(apps => {
            const sortPreference = localStorage.getItem('appnest-sort-preference') || 'alphabetical';
            const sortedApps = sortApplications(apps, sortPreference);
            displayApplications(sortedApps);
            
            window.appData = window.appData || {};
            window.appData.apps = apps;
        })
        .catch(err => console.error('Error refreshing apps:', err));
});