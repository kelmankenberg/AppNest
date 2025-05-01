// App menu functionality

document.addEventListener('DOMContentLoaded', () => {
    // Setup search button click handler
    setupSearchButton();
});

/**
 * Setup the search button in the apps menu
 */
function setupSearchButton() {
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            // Show search and focus via the search.js module
            if (window.appSearch && typeof window.appSearch.showSearchAndFocus === 'function') {
                window.appSearch.showSearchAndFocus();
            } else {
                console.error('Search functionality not available');
            }
        });
    }
}
