// Apply search bar styles based on settings from the main process
async function applySearchBarStyles() {
    try {
        // Get all search inputs on the page
        const searchInputs = document.querySelectorAll('.search-input');
        if (searchInputs.length === 0) {
            console.warn('No search input elements found');
            return;
        }
        
        // Get the style configuration from the main process
        const style = await window.api.getSearchbarStyle();
        console.log('Applying search bar styles:', style);
        
        searchInputs.forEach(input => {
            // Apply border styles
            input.style.borderTop = style.borderTop ? '1px solid var(--border-color, #ccc)' : 'none';
            input.style.borderRight = style.borderRight ? '1px solid var(--border-color, #ccc)' : 'none';
            input.style.borderBottom = style.borderBottom ? '1px solid var(--border-color, #ccc)' : 'none';
            input.style.borderLeft = style.borderLeft ? '1px solid var(--border-color, #ccc)' : 'none';
            
            // Apply compact mode if in thead
            const isInTableHeader = input.closest('thead') !== null;
            if (isInTableHeader && style.compact) {
                input.classList.add('compact');
                input.style.paddingTop = style.paddingTop || '2px';
                input.style.paddingBottom = style.paddingBottom || '2px';
                input.style.marginTop = style.marginTop || '0px';
                input.style.marginBottom = style.marginBottom || '0px';
            } else if (style.minimized) {
                input.classList.add('minimized');
            }
        });
        
        // Also style any search input containers in the thead
        const theadSearchContainers = document.querySelectorAll('thead .search-container');
        theadSearchContainers.forEach(container => {
            container.style.padding = '0';
            container.style.margin = '0';
            container.style.height = 'auto';
        });
        
    } catch (error) {
        console.error('Error applying search bar styles:', error);
    }
}

// Apply styles when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    applySearchBarStyles();
    
    // Listen for style changes from settings
    window.api.onSearchbarStyleChanged((style) => {
        applySearchBarStyles();
    });
    
    // Also re-apply styles when the search input might have been recreated/modified
    // (e.g., after switching tabs or loading new content)
    const observer = new MutationObserver(() => {
        applySearchBarStyles();
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
});
