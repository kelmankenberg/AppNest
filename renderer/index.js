// Add this function to your renderer script:

// Apply search bar styles based on settings
async function applySearchBarStyles() {
    try {
        const searchBar = document.querySelector('.search-input'); // Adjust selector to match your search input element
        if (!searchBar) return;
        
        const style = await window.api.getSearchbarStyle();
        
        // Apply border styles
        searchBar.style.borderTop = style.borderTop ? '1px solid var(--border-color, #ccc)' : 'none';
        searchBar.style.borderRight = style.borderRight ? '1px solid var(--border-color, #ccc)' : 'none';
        searchBar.style.borderBottom = style.borderBottom ? '1px solid var(--border-color, #ccc)' : 'none';
        searchBar.style.borderLeft = style.borderLeft ? '1px solid var(--border-color, #ccc)' : 'none';
        
        // Apply minimized style if needed
        if (style.minimized) {
            searchBar.classList.add('minimized');
        } else {
            searchBar.classList.remove('minimized');
        }
    } catch (error) {
        console.error('Error applying search bar styles:', error);
    }
}

// Call this function on page load
document.addEventListener('DOMContentLoaded', applySearchBarStyles);

// Listen for style changes
window.api.onSearchbarStyleChanged(style => {
    const searchBar = document.querySelector('.search-input'); // Adjust selector to match your search input element
    if (!searchBar) return;
    
    // Apply border styles
    searchBar.style.borderTop = style.borderTop ? '1px solid var(--border-color, #ccc)' : 'none';
    searchBar.style.borderRight = style.borderRight ? '1px solid var(--border-color, #ccc)' : 'none';
    searchBar.style.borderBottom = style.borderBottom ? '1px solid var(--border-color, #ccc)' : 'none';
    searchBar.style.borderLeft = style.borderLeft ? '1px solid var(--border-color, #ccc)' : 'none';
    
    // Apply minimized style if needed
    if (style.minimized) {
        searchBar.classList.add('minimized');
    } else {
        searchBar.classList.remove('minimized');
    }
});
