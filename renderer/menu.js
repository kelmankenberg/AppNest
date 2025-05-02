// Menu creation and handling

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the apps menu with search option at the top
    initializeAppsMenu();
    
    // Set up event listeners for search focus
    setupSearchFocus();
});

// Initialize Apps menu
function initializeAppsMenu() {
    const appsMenu = document.getElementById('apps-menu');
    if (!appsMenu) return;
    
    // Clear existing menu items
    appsMenu.innerHTML = '';
    
    // Add Search option at the top
    const searchMenuItem = document.createElement('li');
    searchMenuItem.className = 'menu-item search-menu-item';
    searchMenuItem.innerHTML = `
        <span class="menu-icon">
            <i class="fas fa-search"></i>
        </span>
        <span class="menu-text">Search</span>
        <span class="menu-shortcut">Ctrl+F</span>
    `;
    
    // Add click event to focus the search input
    searchMenuItem.addEventListener('click', () => {
        window.api.focusSearch();
        focusSearchInput();
    });
    
    // Add the search menu item to the menu
    appsMenu.appendChild(searchMenuItem);
    
    // Add separator after the search menu item
    const separator = document.createElement('li');
    separator.className = 'menu-separator';
    appsMenu.appendChild(separator);
    
    // Continue with other menu items
    // ...
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
    window.api.onFocusSearch(() => {
        focusSearchInput();
    });
}

// Export functions for use in other modules
if (typeof module !== 'undefined') {
    module.exports = {
        initializeAppsMenu,
        focusSearchInput,
        setupSearchFocus
    };
}
