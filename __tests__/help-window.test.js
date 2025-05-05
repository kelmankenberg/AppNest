// filepath: c:\dev\AppNest\__tests__\help-window.test.js

// Mock the window.electronAPI functions
const mockGetHelpContent = jest.fn();
const mockSearchHelp = jest.fn();
const mockGetTheme = jest.fn().mockResolvedValue('light');
const mockOnThemeChanged = jest.fn();
const mockCloseHelpWindow = jest.fn();

describe('Help Window', () => {
  let helpContent;
  let helpNav;
  let helpSearch;
  let closeButton;
  
  // Set up DOM and mocks before each test
  beforeEach(() => {
    // Create clean document body with help window structure
    document.body.innerHTML = `
      <div class="help-container">
        <div class="help-sidebar">
          <div class="help-search">
            <input id="helpSearchInput" type="text" placeholder="Search help..." />
          </div>
          <div class="help-nav">
            <div class="help-nav-item active" data-section="getting-started">
              <span>Getting Started</span>
              <ul class="help-subnav">
                <li data-topic="welcome" class="active">Welcome to AppNest</li>
                <li data-topic="quick-start">Quick Start Guide</li>
              </ul>
            </div>
            <div class="help-nav-item" data-section="features">
              <span>Features</span>
              <ul class="help-subnav">
                <li data-topic="app-launcher">App Launcher</li>
                <li data-topic="folder-access">Folder Access</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="help-content">
          <div class="help-header">
            <h1>AppNest Help</h1>
            <button id="closeHelpWindow" class="close-button" title="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div id="help-content-container">
            <div id="welcome" class="help-topic active">
              <h1>Welcome to AppNest</h1>
              <p class="introduction">Welcome content goes here</p>
            </div>
            <div id="quick-start" class="help-topic">
              <h1>Quick Start Guide</h1>
              <p class="introduction">Quick start content goes here</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Get references to main DOM elements
    helpNav = document.querySelector('.help-nav');
    helpContent = document.getElementById('help-content-container');
    helpSearch = document.getElementById('helpSearchInput');
    closeButton = document.getElementById('closeHelpWindow');
    
    // Mock window.electronAPI
    window.electronAPI = {
      getHelpContent: mockGetHelpContent,
      searchHelp: mockSearchHelp, 
      getTheme: mockGetTheme,
      onThemeChanged: mockOnThemeChanged,
      closeHelpWindow: mockCloseHelpWindow
    };
    
    // Reset mocks
    mockGetHelpContent.mockReset();
    mockSearchHelp.mockReset();
    mockGetTheme.mockClear();
    mockCloseHelpWindow.mockClear();
    
    // Mock implementations
    mockGetHelpContent.mockImplementation((topicId) => {
      if (topicId === 'app-launcher') {
        return Promise.resolve(`
          <h1>App Launcher</h1>
          <p class="introduction">The App Launcher feature helps you organize and access your applications.</p>
          <div class="help-section">
            <h2>Using the App Launcher</h2>
            <p>Instructions on using the launcher go here.</p>
          </div>
        `);
      } else if (topicId === 'folder-access') {
        return Promise.resolve(`
          <h1>Folder Access</h1>
          <p class="introduction">The Folder Access feature provides quick links to common folders.</p>
          <div class="help-section">
            <h2>Accessing Folders</h2>
            <p>Instructions on accessing folders go here.</p>
          </div>
        `);
      } else {
        return Promise.resolve(null);
      }
    });
    
    mockSearchHelp.mockImplementation((searchTerm) => {
      if (searchTerm.includes('app') || searchTerm.includes('launch')) {
        return Promise.resolve([
          { 
            id: 'app-launcher', 
            title: 'App Launcher', 
            relevance: 1.0,
            excerpt: 'The App Launcher feature helps you organize and access your applications.'
          }
        ]);
      } else if (searchTerm.includes('folder')) {
        return Promise.resolve([
          { 
            id: 'folder-access', 
            title: 'Folder Access', 
            relevance: 1.0,
            excerpt: 'The Folder Access feature provides quick links to common folders.'
          }
        ]);
      } else {
        return Promise.resolve([]);
      }
    });
    
    // Load and initialize the help window functions
    // Use a simplified version of the functions from help-renderer.js
    function initializeHelp() {
      setupNavigation();
      setupSearch();
      setupThemeSync();
      setupCloseButton();
    }

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

    function setupSearch() {
      const searchInput = document.getElementById('helpSearchInput');
      if (!searchInput) return;
      
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const searchTerm = searchInput.value.trim().toLowerCase();
          if (searchTerm.length >= 2) {
            performSearch(searchTerm);
          }
        }
      });
    }

    function performSearch(searchTerm) {
      if (window.electronAPI && window.electronAPI.searchHelp) {
        window.electronAPI.searchHelp(searchTerm)
          .then(results => {
            displaySearchResults(results, searchTerm);
          })
          .catch(error => {
            console.error('Error searching help content:', error);
          });
      }
    }

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
            // Show the topic content
            showHelpTopic(topicId);
          }
        });
      });
    }

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

    // Execute the initialization function
    initializeHelp();
  });
  
  // Tests for navigation
  test('Section navigation should toggle active class', () => {
    // Get the second section
    const featuresSection = document.querySelector('.help-nav-item[data-section="features"]');
    
    // Initially, the first section should be active
    expect(document.querySelector('.help-nav-item[data-section="getting-started"]').classList.contains('active')).toBe(true);
    expect(featuresSection.classList.contains('active')).toBe(false);
    
    // Click on the features section
    featuresSection.click();
    
    // Now the features section should be active and the first section inactive
    expect(document.querySelector('.help-nav-item[data-section="getting-started"]').classList.contains('active')).toBe(false);
    expect(featuresSection.classList.contains('active')).toBe(true);
  });
  
  test('Topic navigation should show the corresponding content', () => {
    // Get the second topic in the first section
    const quickStartTopic = document.querySelector('li[data-topic="quick-start"]');
    
    // Initially, the first topic should be active
    expect(document.querySelector('li[data-topic="welcome"]').classList.contains('active')).toBe(true);
    expect(document.getElementById('welcome').classList.contains('active')).toBe(true);
    expect(document.getElementById('quick-start').classList.contains('active')).toBe(false);
    
    // Click on the quick start topic
    quickStartTopic.click();
    
    // Now the quick start topic should be active and its content visible
    expect(document.querySelector('li[data-topic="welcome"]').classList.contains('active')).toBe(false);
    expect(quickStartTopic.classList.contains('active')).toBe(true);
    expect(document.getElementById('welcome').classList.contains('active')).toBe(false);
    expect(document.getElementById('quick-start').classList.contains('active')).toBe(true);
  });
  
  test('Topic navigation should load content dynamically when not in DOM', async () => {
    // Get the app launcher topic
    const appLauncherTopic = document.querySelector('li[data-topic="app-launcher"]');
    
    // Initially, the topic content should not exist in the DOM
    expect(document.getElementById('app-launcher')).toBeNull();
    
    // Click on the app launcher topic
    appLauncherTopic.click();
    
    // The API should have been called to get the content
    expect(mockGetHelpContent).toHaveBeenCalledWith('app-launcher');
    
    // Wait for the content to be loaded
    await new Promise(process.nextTick);
    
    // Now the content should be in the DOM and active
    const appLauncherContent = document.getElementById('app-launcher');
    expect(appLauncherContent).not.toBeNull();
    expect(appLauncherContent.classList.contains('active')).toBe(true);
    expect(appLauncherContent.innerHTML).toContain('App Launcher');
    expect(appLauncherContent.innerHTML).toContain('Using the App Launcher');
  });
  
  test('Should show "topic not found" for non-existent topics', async () => {
    // Mock the getHelpContent to return null for this topic
    mockGetHelpContent.mockResolvedValueOnce(null);
    
    // Call the showHelpTopic function directly with a non-existent topic
    const helpModule = {
      showHelpTopic: (topicId) => {
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
    };
    
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
      }
    }
    
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
    
    // Show a non-existent topic
    helpModule.showHelpTopic('non-existent-topic');
    
    // API should have been called
    expect(mockGetHelpContent).toHaveBeenCalledWith('non-existent-topic');
    
    // Wait for the content to be processed
    await new Promise(process.nextTick);
    
    // Now the "topic not found" content should be in the DOM and active
    const notFoundContent = document.getElementById('non-existent-topic');
    expect(notFoundContent).not.toBeNull();
    expect(notFoundContent.classList.contains('active')).toBe(true);
    expect(notFoundContent.innerHTML).toContain('Topic Not Found');
    expect(notFoundContent.innerHTML).toContain('Sorry, the help topic "non-existent-topic" is not available yet.');
  });
  
  // Tests for search functionality
  test('Search should display results when Enter key is pressed', async () => {
    // Set a search term in the input
    helpSearch.value = 'app';
    
    // Trigger Enter key press
    const keyEvent = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
    helpSearch.dispatchEvent(keyEvent);
    
    // API should have been called
    expect(mockSearchHelp).toHaveBeenCalledWith('app');
    
    // Wait for the results to be processed
    await new Promise(process.nextTick);
    
    // Search results should be displayed
    const searchResults = document.getElementById('search-results');
    expect(searchResults).not.toBeNull();
    expect(searchResults.classList.contains('active')).toBe(true);
    expect(searchResults.innerHTML).toContain('Search Results');
    expect(searchResults.innerHTML).toContain('Showing results for: <strong>app</strong>');
    expect(searchResults.innerHTML).toContain('App Launcher');
  });
  
  test('Search should show "no results" message when no matches found', async () => {
    // Mock the search API to return empty results
    mockSearchHelp.mockResolvedValueOnce([]);
    
    // Set a search term in the input
    helpSearch.value = 'nonexistent';
    
    // Trigger Enter key press
    const keyEvent = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
    helpSearch.dispatchEvent(keyEvent);
    
    // API should have been called
    expect(mockSearchHelp).toHaveBeenCalledWith('nonexistent');
    
    // Wait for the results to be processed
    await new Promise(process.nextTick);
    
    // Search results with "no results" message should be displayed
    const searchResults = document.getElementById('search-results');
    expect(searchResults).not.toBeNull();
    expect(searchResults.innerHTML).toContain('No results found for "nonexistent"');
    expect(searchResults.innerHTML).toContain('Try using different keywords');
  });
  
  test('Clicking on a search result should show the corresponding topic', async () => {
    // First perform a search to get results
    helpSearch.value = 'folder';
    const keyEvent = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
    helpSearch.dispatchEvent(keyEvent);
    
    // Wait for the results to be processed
    await new Promise(process.nextTick);
    
    // Get the search result item
    const searchResultItem = document.querySelector('.search-result-item[data-topic="folder-access"]');
    expect(searchResultItem).not.toBeNull();
    
    // Click on the search result
    searchResultItem.click();
    
    // API should have been called to get the topic content
    expect(mockGetHelpContent).toHaveBeenCalledWith('folder-access');
    
    // Wait for the content to be processed
    await new Promise(process.nextTick);
    
    // The folder access topic should be loaded and active
    const folderAccessContent = document.getElementById('folder-access');
    expect(folderAccessContent).not.toBeNull();
    expect(folderAccessContent.classList.contains('active')).toBe(true);
    expect(folderAccessContent.innerHTML).toContain('Folder Access');
    
    // Search results should no longer be active
    const searchResults = document.getElementById('search-results');
    expect(searchResults.classList.contains('active')).toBe(false);
  });
  
  // Tests for theme handling
  test('Theme should be applied based on the API response', async () => {
    // Initially light theme, dark-theme class should not be present
    expect(document.body.classList.contains('dark-theme')).toBe(false);
    
    // Wait for the initial theme to be applied
    await new Promise(process.nextTick);
    
    // API should have been called
    expect(mockGetTheme).toHaveBeenCalled();
    
    // Dark theme should be applied when the callback is triggered with 'dark'
    // Get the callback that was registered
    const themeCallback = mockOnThemeChanged.mock.calls[0][0];
    
    // Call the callback with 'dark'
    themeCallback('dark');
    
    // dark-theme class should now be present
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    
    // Call the callback with 'light'
    themeCallback('light');
    
    // dark-theme class should now be removed
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });
  
  // Test close button
  test('Close button should call closeHelpWindow API', () => {
    // Click the close button
    closeButton.click();
    
    // API should have been called
    expect(mockCloseHelpWindow).toHaveBeenCalled();
  });
});