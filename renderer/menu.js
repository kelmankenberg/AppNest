// Menu creation and handling

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the apps menu with search option at the top
    initializeAppsMenu();
    
    // Set up event listeners for search focus
    setupSearchFocus();
});

// Initialize Apps menu
function initializeAppsMenu() {
    const appsMenu = document.getElementById('appsMenu');
    if (!appsMenu) {
        console.error("Apps menu element not found in the document");
        return;
    }
    
    // Add Sort option after the search option and before the separator
    const searchMenuItem = document.getElementById('searchMenuItem');
    const addAppMenuItem = document.getElementById('addAppMenuItem');
    
    if (!searchMenuItem || !addAppMenuItem) {
        console.error("Required menu items not found");
        return;
    }
    
    // Create the Sort menu item
    const sortMenuItem = document.createElement('button');
    sortMenuItem.className = 'menu-item sort-menu-item';
    sortMenuItem.id = 'sortMenuItem';
    sortMenuItem.innerHTML = `
        <i class="fas fa-sort"></i>
        <span>Sort</span>
        <i class="fas fa-chevron-right submenu-icon"></i>
    `;
    
    // Create submenu for sort options
    const sortSubmenu = document.createElement('div');
    sortSubmenu.className = 'submenu sort-submenu';
    sortSubmenu.id = 'sortSubmenu';
    
    // Add sort options to submenu
    const sortOptions = [
        { name: 'Alphabetical', value: 'alphabetical', icon: 'fas fa-sort-alpha-down' },
        { name: 'Categories', value: 'categories', icon: 'fas fa-th-large' },
        { name: 'Favorites', value: 'favorites', icon: 'fas fa-star' },
        { name: 'Most Used', value: 'most-used', icon: 'fas fa-chart-line' },
        { name: 'Portable/Installed', value: 'installation-type', icon: 'fas fa-box' }
    ];
    
    // Get the current sort preference from localStorage or use default
    const currentSortPreference = localStorage.getItem('appnest-sort-preference') || 'alphabetical';
    
    sortOptions.forEach(option => {
        const sortOption = document.createElement('button');
        sortOption.className = 'submenu-item';
        sortOption.setAttribute('data-sort-value', option.value);
        
        // No check mark, just icon and text
        sortOption.innerHTML = `
            <i class="${option.icon} submenu-icon"></i>
            <span class="submenu-text">${option.name}</span>
        `;
        
        // Add the 'active' class to the selected option
        if (option.value === currentSortPreference) {
            sortOption.classList.add('active');
        }
        
        // Add click event to set the sort option
        sortOption.addEventListener('click', () => {
            // Remove active class from all sort options
            sortSubmenu.querySelectorAll('.submenu-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to selected option
            sortOption.classList.add('active');
            
            // Apply the sorting option - use the global window function instead
            if (typeof window.applySortOption === 'function') {
                window.applySortOption(option.value);
            } else {
                console.error('applySortOption function not available on window object');
            }
            
            // Hide submenu after selection
            sortSubmenu.classList.remove('show');
        });
        
        sortSubmenu.appendChild(sortOption);
    });
    
    // Append the submenu to the document body for proper positioning
    document.body.appendChild(sortSubmenu);
    
    // Insert the Sort menu item after Search and before the separator
    const firstSeparator = appsMenu.querySelector('.menu-separator');
    if (firstSeparator) {
        appsMenu.insertBefore(sortMenuItem, firstSeparator);
    } else {
        // If separator not found, insert before Add New App
        appsMenu.insertBefore(sortMenuItem, addAppMenuItem);
    }
    
    // Show/hide submenu on hover/click
    sortMenuItem.addEventListener('mouseenter', () => {
        positionSubmenu(sortMenuItem, sortSubmenu);
        sortSubmenu.classList.add('show');
    });
    
    sortSubmenu.addEventListener('mouseleave', () => {
        sortSubmenu.classList.remove('show');
    });
    
    // Also hide submenu when moving away from the sort menu item
    // but not entering the submenu
    sortMenuItem.addEventListener('mouseleave', (e) => {
        // Check if the mouse is moving toward the submenu
        const rect = sortSubmenu.getBoundingClientRect();
        if (!(e.clientX >= rect.left && 
              e.clientX <= rect.right && 
              e.clientY >= rect.top - 20 && 
              e.clientY <= rect.bottom)) {
            setTimeout(() => {
                if (!sortSubmenu.matches(':hover')) {
                    sortSubmenu.classList.remove('show');
                }
            }, 100);
        }
    });

    // Attach click handler to Add New App menu item
    addAppMenuItem.addEventListener('click', () => {
        // Show the Add App dialog
        const addAppDialog = document.getElementById('addAppDialog');
        if (addAppDialog) {
            addAppDialog.style.display = 'block';
        }
        // Clear the form
        if (typeof window.clearAddAppForm === 'function') {
            window.clearAddAppForm();
        }
        // Load categories
        if (typeof window.loadCategories === 'function') {
            window.loadCategories();
        }
        // Hide the menu after opening
        const appsMenu = document.getElementById('appsMenu');
        if (appsMenu) {
            appsMenu.style.display = 'none';
        }
    });
}

// Position the submenu next to its parent menu item
function positionSubmenu(menuItem, submenu) {
    const menuRect = menuItem.getBoundingClientRect();
    const submenuWidth = submenu.offsetWidth || 170; // Use our updated width
    
    // Position to the right of the menu item by default
    submenu.style.top = `${menuRect.top}px`;
    submenu.style.left = `${menuRect.right}px`;
    
    // Check if submenu would go off-screen to the right
    const viewportWidth = window.innerWidth;
    if (menuRect.right + submenuWidth > viewportWidth) {
        // Position to the left of the menu item instead
        submenu.style.left = `${menuRect.left - submenuWidth}px`;
        
        // Now check if it would go off-screen to the left
        if (parseInt(submenu.style.left) < 0) {
            // If it would go off the left edge, position it at the left edge with a small margin
            submenu.style.left = '5px';
        }
    }
}

// Apply the selected sort option
function applySortOption(sortValue) {
    console.log(`Applying sort option: ${sortValue}`);
    
    // Save the user's preference to localStorage for persistence in the current window
    localStorage.setItem('appnest-sort-preference', sortValue);
    
    // Apply the sorting immediately to the current app list
    const apps = window.appData?.apps || [];
    if (apps.length > 0) {
        const sortedApps = window.sortApplications(apps, sortValue);
        window.displayApplications(sortedApps);
    } else {
        // If apps aren't loaded yet, just reload applications using the sort preference
        window.loadApplications();
    }
    
    // Show a visual indicator that sorting has been applied
    showSortingNotification(sortValue);
}

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

// Focus the search input
function focusSearchInput() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.focus();
    }
}

// Set up event listener for the search focus event from main process
function setupSearchFocus() {
    if (window.api && window.api.onFocusSearch) {
        window.api.onFocusSearch(() => {
            focusSearchInput();
        });
    } else {
        console.warn("Search focus API not available");
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined') {
    module.exports = {
        initializeAppsMenu,
        focusSearchInput,
        setupSearchFocus
    };
}
