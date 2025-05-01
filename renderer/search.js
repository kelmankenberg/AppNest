/**
 * Search functionality for AppNest
 * With toggle capability for Ctrl+F
 */

// Keep track of search visibility state
let searchVisible = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Search module initializing');
    
    // Set up search input event handler
    setupSearchInput();
    
    // Set up keyboard events
    setupKeyboardEvents();
    
    // Set up Ctrl+F shortcut handler from main process
    setupShortcutHandler();
});

/**
 * Set up search input event handler
 */
function setupSearchInput() {
    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    
    // Handle input event for live filtering
    searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.trim().toLowerCase();
        filterAppsByName(searchText);
    });
}

/**
 * Set up keyboard events
 */
function setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const searchInput = document.querySelector('.search-input');
            
            // Clear search input
            if (searchInput) {
                searchInput.value = '';
                filterAppsByName(''); // Show all apps
            }
            
            // Hide search header
            hideSearch();
        }
    });
}

/**
 * Set up the Ctrl+F shortcut handler from main process
 */
function setupShortcutHandler() {
    // Check if the API is available
    if (window.api && typeof window.api.onFocusSearch === 'function') {
        // Register callback for when focus-search event is received
        window.api.onFocusSearch(() => {
            console.log('Received Ctrl+F shortcut from main process');
            toggleSearch();
        });
        console.log('Ctrl+F shortcut handler registered');
    } else {
        console.error('API for focus-search not available');
    }
}

/**
 * Toggle search visibility (show/hide)
 */
function toggleSearch() {
    const searchHeader = document.querySelector('.search-header');
    if (!searchHeader) return;
    
    // Toggle search visibility
    if (searchVisible) {
        // If search is visible, hide it
        hideSearch();
    } else {
        // If search is hidden, show it and focus
        showSearchAndFocus();
    }
}

/**
 * Filter apps in table by name
 */
function filterAppsByName(searchText) {
    console.log(`Filtering apps by name: "${searchText}"`);
    
    // Get all app rows from the table
    const appRows = document.querySelectorAll('.app-table tbody tr');
    console.log(`Found ${appRows.length} app rows`);
    
    // Remove any existing "no results" message
    removeNoResultsMessage();
    
    // If search is empty, show all apps
    if (!searchText) {
        appRows.forEach(row => {
            row.style.display = '';
        });
        return;
    }
    
    // Keep track if we found any matches
    let foundMatch = false;
    
    // Go through each app row
    appRows.forEach(row => {
        // Skip the "no results" row if it exists
        if (row.classList.contains('no-results-row')) return;
        
        // Get the app name
        let appName = '';
        
        // Try different selectors to find the app name
        const nameElement = 
            row.querySelector('.app-name') || 
            row.querySelector('.name') ||
            row.querySelector('td');
        
        if (nameElement) {
            // Get the text content
            appName = nameElement.textContent.trim().toLowerCase();
            
            // Check if this app matches the search text
            const isMatch = appName.includes(searchText);
            
            if (isMatch) {
                // Show this row
                row.style.display = '';
                foundMatch = true;
            } else {
                // Hide this row
                row.style.display = 'none';
            }
        } else {
            // If we can't find a name element, hide the row
            row.style.display = 'none';
        }
    });
    
    // If no matches were found, show a message
    if (!foundMatch) {
        showNoResultsMessage(searchText);
    }
}

/**
 * Show "no results" message in the table
 */
function showNoResultsMessage(searchText) {
    // Make sure we don't already have a message
    removeNoResultsMessage();
    
    // Get the tbody element
    const tbody = document.querySelector('.app-table tbody');
    if (!tbody) return;
    
    // Create and add the no results message row
    const noResultsRow = document.createElement('tr');
    noResultsRow.id = 'no-results-row';
    noResultsRow.className = 'no-results-row';
    noResultsRow.innerHTML = `
        <td colspan="3" style="text-align: center; padding: 30px 0;">
            <div style="display: flex; flex-direction: column; align-items: center;">
                <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No applications found matching "${searchText}"</p>
            </div>
        </td>
    `;
    
    tbody.appendChild(noResultsRow);
}

/**
 * Remove "no results" message from the table
 */
function removeNoResultsMessage() {
    const noResultsRow = document.getElementById('no-results-row');
    if (noResultsRow) {
        noResultsRow.remove();
    }
}

/**
 * Show search and focus input
 */
function showSearchAndFocus() {
    console.log('Showing search and focusing input');
    
    // Show search header
    const searchHeader = document.querySelector('.search-header');
    if (searchHeader) {
        searchHeader.classList.remove('hidden');
        searchVisible = true;
    }
    
    // Focus search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        setTimeout(() => {
            searchInput.focus();
            searchInput.select(); // Select any existing text
        }, 50);
    }
}

/**
 * Hide the search header
 */
function hideSearch() {
    const searchHeader = document.querySelector('.search-header');
    const searchInput = document.querySelector('.search-input');
    
    if (searchHeader) {
        searchHeader.classList.add('hidden');
        searchVisible = false;
    }
    
    // Clear search if it's being hidden
    if (searchInput && searchInput.value) {
        searchInput.value = '';
        filterAppsByName(''); // Reset filtering
    }
}

// Expose functions to other modules
window.appSearch = {
    showSearchAndFocus,
    filterAppsByName,
    toggleSearch,
    hideSearch
};
