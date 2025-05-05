// Help window renderer script
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the help window functionality
    initializeHelp();
});

/**
 * Initialize help window functionality
 */
function initializeHelp() {
    setupNavigation();
    setupSearch();
    setupThemeSync();
    setupCloseButton();
}

/**
 * Set up the navigation functionality
 */
function setupNavigation() {
    // Section navigation (main categories)
    const sectionItems = document.querySelectorAll('.help-nav-item');
    sectionItems.forEach(item => {
        item.addEventListener('click', () => {
            // Toggle active state for section
            sectionItems.forEach(section => section.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Topic navigation (sub-items)
    const topicItems = document.querySelectorAll('.help-subnav li');
    topicItems.forEach(topic => {
        topic.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling to parent section
            
            // Toggle active state for topic
            topicItems.forEach(t => t.classList.remove('active'));
            topic.classList.add('active');
            
            // Show the corresponding content
            const topicId = topic.getAttribute('data-topic');
            showHelpTopic(topicId);
        });
    });
}

/**
 * Show the specified help topic
 * @param {string} topicId - ID of the topic to display
 */
function showHelpTopic(topicId) {
    // Hide all topics
    const allTopics = document.querySelectorAll('.help-topic');
    allTopics.forEach(topic => topic.classList.remove('active'));
    
    // Show the selected topic if it exists
    const selectedTopic = document.getElementById(topicId);
    if (selectedTopic) {
        selectedTopic.classList.add('active');
    } else {
        // If topic doesn't exist in the DOM, load it dynamically
        loadHelpContent(topicId);
    }
}

/**
 * Load help content dynamically
 * @param {string} topicId - ID of the topic to load
 */
function loadHelpContent(topicId) {
    const contentContainer = document.getElementById('help-content-container');
    
    // Try to get the topic from the backend
    if (window.electronAPI && window.electronAPI.getHelpContent) {
        window.electronAPI.getHelpContent(topicId)
            .then(content => {
                if (content) {
                    // Create a new topic div and add the content
                    const topicDiv = document.createElement('div');
                    topicDiv.id = topicId;
                    topicDiv.className = 'help-topic active';
                    topicDiv.innerHTML = content;
                    contentContainer.appendChild(topicDiv);
                } else {
                    showTopicNotFound(topicId);
                }
            })
            .catch(error => {
                console.error('Error loading help content:', error);
                showTopicNotFound(topicId);
            });
    } else {
        // Fallback if API is not available - show placeholder
        showTopicNotFound(topicId);
    }
}

/**
 * Show a "topic not found" message
 * @param {string} topicId - ID of the topic that wasn't found
 */
function showTopicNotFound(topicId) {
    const contentContainer = document.getElementById('help-content-container');
    
    const notFoundDiv = document.createElement('div');
    notFoundDiv.id = topicId;
    notFoundDiv.className = 'help-topic active';
    notFoundDiv.innerHTML = `
        <h1>Topic Not Found</h1>
        <p class="introduction">
            Sorry, the help topic "${topicId}" is not available yet.
        </p>
        <div class="help-section">
            <p>This topic may be under development or not applicable to the current version.</p>
            <p>Please try another topic from the navigation menu or check back later.</p>
        </div>
    `;
    contentContainer.appendChild(notFoundDiv);
}

/**
 * Set up the search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('helpSearchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set a new timeout for debouncing
        searchTimeout = setTimeout(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm.length >= 3) {
                performSearch(searchTerm);
            }
        }, 300);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm.length >= 2) {
                performSearch(searchTerm);
            }
        }
    });
}

/**
 * Perform a search in the help content
 * @param {string} searchTerm - Term to search for
 */
function performSearch(searchTerm) {
    if (window.electronAPI && window.electronAPI.searchHelp) {
        window.electronAPI.searchHelp(searchTerm)
            .then(results => {
                displaySearchResults(results, searchTerm);
            })
            .catch(error => {
                console.error('Error searching help content:', error);
            });
    } else {
        // Fallback client-side search in existing DOM content
        const allTopics = document.querySelectorAll('.help-topic');
        const results = [];
        
        allTopics.forEach(topic => {
            const topicId = topic.id;
            const topicTitle = topic.querySelector('h1')?.textContent || topicId;
            const topicContent = topic.textContent.toLowerCase();
            
            if (topicContent.includes(searchTerm)) {
                results.push({
                    id: topicId,
                    title: topicTitle,
                    relevance: 1 // Simple relevance for client-side search
                });
            }
        });
        
        displaySearchResults(results, searchTerm);
    }
}

/**
 * Display search results
 * @param {Array} results - Search results array
 * @param {string} searchTerm - The search term used
 */
function displaySearchResults(results, searchTerm) {
    const contentContainer = document.getElementById('help-content-container');
    
    // Create search results container
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'search-results';
    resultsDiv.className = 'help-topic active';
    
    // Create results content
    let resultsHtml = `
        <h1>Search Results</h1>
        <p class="introduction">
            Showing results for: <strong>${searchTerm}</strong>
        </p>
    `;
    
    if (results && results.length > 0) {
        resultsHtml += `<div class="help-section">
            <ul class="search-results-list">
        `;
        
        results.forEach(result => {
            resultsHtml += `
                <li class="search-result-item" data-topic="${result.id}">
                    <h3>${result.title}</h3>
                    ${result.excerpt ? `<p>${result.excerpt}</p>` : ''}
                </li>
            `;
        });
        
        resultsHtml += `
            </ul>
        </div>`;
    } else {
        resultsHtml += `
            <div class="help-section">
                <p>No results found for "${searchTerm}".</p>
                <p>Try using different keywords or check your spelling.</p>
            </div>
        `;
    }
    
    // Set content and replace current view
    resultsDiv.innerHTML = resultsHtml;
    
    // Hide all topics and show search results
    const allTopics = document.querySelectorAll('.help-topic');
    allTopics.forEach(topic => topic.classList.remove('active'));
    
    // Remove any existing search results
    const existingResults = document.getElementById('search-results');
    if (existingResults) {
        existingResults.remove();
    }
    
    contentContainer.appendChild(resultsDiv);
    
    // Add click handlers to results
    const resultItems = document.querySelectorAll('.search-result-item');
    resultItems.forEach(item => {
        item.addEventListener('click', () => {
            const topicId = item.getAttribute('data-topic');
            if (topicId) {
                // Activate the corresponding navigation item
                const topicNavItem = document.querySelector(`.help-subnav li[data-topic="${topicId}"]`);
                if (topicNavItem) {
                    // Find parent section and activate it
                    const parentSection = topicNavItem.closest('.help-nav-item');
                    if (parentSection) {
                        const allSections = document.querySelectorAll('.help-nav-item');
                        allSections.forEach(section => section.classList.remove('active'));
                        parentSection.classList.add('active');
                    }
                    
                    // Activate the topic nav item
                    const allTopicNavItems = document.querySelectorAll('.help-subnav li');
                    allTopicNavItems.forEach(navItem => navItem.classList.remove('active'));
                    topicNavItem.classList.add('active');
                }
                
                // Show the topic content
                showHelpTopic(topicId);
            }
        });
    });
}

/**
 * Set up theme synchronization with the main window
 */
function setupThemeSync() {
    if (window.electronAPI && window.electronAPI.onThemeChanged) {
        window.electronAPI.onThemeChanged(theme => {
            // Apply theme by toggling dark-theme class on body
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        });
        
        // Get initial theme
        if (window.electronAPI.getTheme) {
            window.electronAPI.getTheme().then(theme => {
                if (theme === 'dark') {
                    document.body.classList.add('dark-theme');
                }
            });
        }
    }
}

/**
 * Set up the close button
 */
function setupCloseButton() {
    const closeButton = document.getElementById('closeHelpWindow');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.closeHelpWindow) {
                window.electronAPI.closeHelpWindow();
            } else {
                // Fallback: try to close window with window.close()
                window.close();
            }
        });
    }
}