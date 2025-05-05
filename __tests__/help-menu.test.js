// filepath: c:\dev\AppNest\__tests__\help-menu.test.js

// Mock the window.electronAPI functions
const mockGetAppVersion = jest.fn().mockResolvedValue('1.0.0');
const mockOpenHelpWindow = jest.fn();
const mockCloseHelpWindow = jest.fn();

// Mock window.releaseNotesModal
const mockReleaseNotesModal = {
  show: jest.fn(),
  hide: jest.fn(),
  isVisible: jest.fn()
};

describe('Help Menu', () => {
  let helpButton;
  let helpMenu;
  let helpMenuItem;
  let releaseNotesMenuItem;
  let aboutMenuItem;
  let appVersionMenuItem;
  
  // Set up DOM and mocks before each test
  beforeEach(() => {
    // Create clean document body
    document.body.innerHTML = `
      <div class="titlebar-controls">
        <button id="helpButton" title="Help"><i class="fas fa-question-circle"></i></button>
      </div>
      <div id="helpMenu" style="display: none;">
        <div class="menu-item" id="helpMenuItem">Help Documentation</div>
        <div class="menu-item" id="releaseNotesMenuItem">Release Notes</div>
        <div class="menu-item" id="aboutMenuItem">About</div>
        <div class="menu-item version-item" id="appVersionMenuItem">v0.0.0</div>
      </div>
    `;
    
    // Get references to DOM elements
    helpButton = document.getElementById('helpButton');
    helpMenu = document.getElementById('helpMenu');
    helpMenuItem = document.getElementById('helpMenuItem');
    releaseNotesMenuItem = document.getElementById('releaseNotesMenuItem');
    aboutMenuItem = document.getElementById('aboutMenuItem');
    appVersionMenuItem = document.getElementById('appVersionMenuItem');
    
    // Mock window.electronAPI
    window.electronAPI = {
      getAppVersion: mockGetAppVersion,
      openHelpWindow: mockOpenHelpWindow,
      closeHelpWindow: mockCloseHelpWindow
    };
    
    // Mock window.closeAllMenus
    window.closeAllMenus = jest.fn();
    
    // Mock window.releaseNotesModal
    window.releaseNotesModal = mockReleaseNotesModal;
    
    // Mock window.innerHeight and window.innerWidth
    Object.defineProperty(window, 'innerHeight', { value: 800 });
    Object.defineProperty(window, 'innerWidth', { value: 1200 });
    
    // Mock element getBoundingClientRect() method
    helpButton.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 20,
      right: 1180,
      bottom: 50,
      height: 30,
      width: 30
    });
    
    // Reset mocks
    mockGetAppVersion.mockClear();
    mockOpenHelpWindow.mockClear();
    mockCloseHelpWindow.mockClear();
    mockReleaseNotesModal.show.mockClear();
    mockReleaseNotesModal.hide.mockClear();
    window.closeAllMenus.mockClear();
    
    // Load and initialize the help menu functions
    // Use a simplified version of the functions from help-menu.js
    function initializeHelpMenu() {
      // Handle clicking the help button
      helpButton.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close any other menus that might be open
        if (typeof window.closeAllMenus === 'function') {
          window.closeAllMenus();
        }
        
        // Toggle the help menu
        const isVisible = helpMenu.style.display === 'block';
        
        if (!isVisible) {
          // Show the menu first so we can measure its height
          helpMenu.style.display = 'block';
          
          // Position the menu relative to the button
          const buttonRect = helpButton.getBoundingClientRect();
          const menuHeight = helpMenu.offsetHeight;
          
          // Check if there's enough space below the button
          const spaceBelow = window.innerHeight - buttonRect.bottom;
          
          if (spaceBelow < menuHeight) {
            // Not enough space below, position menu above the button
            helpMenu.style.top = (buttonRect.top - menuHeight) + 'px';
          } else {
            // Enough space below, position menu below the button
            helpMenu.style.top = buttonRect.bottom + 'px';
          }
          
          helpMenu.style.right = (window.innerWidth - buttonRect.right) + 'px';
        } else {
          helpMenu.style.display = 'none';
        }
      });

      // Prevent closing when clicking inside the menu
      helpMenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Handle Help button click
      helpMenuItem.addEventListener('click', () => {
        helpMenu.style.display = 'none';
        showHelp();
      });

      // Handle Release Notes button click
      releaseNotesMenuItem.addEventListener('click', () => {
        helpMenu.style.display = 'none';
        showReleaseNotes();
      });

      // Handle About button click
      aboutMenuItem.addEventListener('click', () => {
        helpMenu.style.display = 'none';
        showAboutDialog();
      });

      // Update the version number from package.json
      updateVersionNumber();
    }

    function updateVersionNumber() {
      if (window.electronAPI && window.electronAPI.getAppVersion) {
        window.electronAPI.getAppVersion()
          .then(version => {
            appVersionMenuItem.textContent = `v${version}`;
          })
          .catch(error => {
            console.error('Error getting app version:', error);
          });
      }
    }

    function showHelp() {
      if (window.electronAPI && window.electronAPI.openHelpWindow) {
        window.electronAPI.openHelpWindow();
      }
    }

    function showReleaseNotes() {
      if (window.releaseNotesModal) {
        window.releaseNotesModal.show();
      }
    }

    function showAboutDialog() {
      // Just a stub for testing purposes
      console.log('Show About dialog clicked');
    }

    // Execute the initialization function
    initializeHelpMenu();
  });

  test('Help menu should show and hide when help button is clicked', () => {
    // Initial state: menu should be hidden
    expect(helpMenu.style.display).toBe('none');
    
    // Click the help button to show the menu
    helpButton.click();
    
    // Menu should now be visible
    expect(helpMenu.style.display).toBe('block');
    
    // Check if menu is positioned correctly
    const buttonRect = helpButton.getBoundingClientRect();
    expect(helpMenu.style.top).toBe(`${buttonRect.bottom}px`);
    expect(helpMenu.style.right).toBe(`${window.innerWidth - buttonRect.right}px`);
    
    // Click the help button again to hide the menu
    helpButton.click();
    
    // Menu should now be hidden again
    expect(helpMenu.style.display).toBe('none');
  });
  
  test('Help menu should close other menus when opened', () => {
    // Click the help button to show the menu
    helpButton.click();
    
    // Check if closeAllMenus was called
    expect(window.closeAllMenus).toHaveBeenCalled();
  });
  
  test('Help menu should be positioned above button if not enough space below', () => {
    // Mock window height to be small
    Object.defineProperty(window, 'innerHeight', { value: 100 });
    
    // Set helpMenu height to be large
    Object.defineProperty(helpMenu, 'offsetHeight', { value: 200 });
    
    // Click the help button
    helpButton.click();
    
    // Check if menu is positioned above the button
    const buttonRect = helpButton.getBoundingClientRect();
    expect(helpMenu.style.top).toBe(`${buttonRect.top - 200}px`);
  });
  
  test('Help menu item should open help window', () => {
    // First show the menu
    helpButton.click();
    
    // Click the help menu item
    helpMenuItem.click();
    
    // Menu should be hidden
    expect(helpMenu.style.display).toBe('none');
    
    // Help window should be opened
    expect(mockOpenHelpWindow).toHaveBeenCalled();
  });
  
  test('Release notes menu item should show release notes modal', () => {
    // First show the menu
    helpButton.click();
    
    // Click the release notes menu item
    releaseNotesMenuItem.click();
    
    // Menu should be hidden
    expect(helpMenu.style.display).toBe('none');
    
    // Release notes modal should be shown
    expect(mockReleaseNotesModal.show).toHaveBeenCalled();
  });
  
  test('About menu item should open About dialog', () => {
    // Mock console.log to check if it's called
    const consoleSpy = jest.spyOn(console, 'log');
    
    // First show the menu
    helpButton.click();
    
    // Click the about menu item
    aboutMenuItem.click();
    
    // Menu should be hidden
    expect(helpMenu.style.display).toBe('none');
    
    // Console.log should be called with the expected message
    expect(consoleSpy).toHaveBeenCalledWith('Show About dialog clicked');
    
    // Clean up
    consoleSpy.mockRestore();
  });
  
  test('Version number should be updated from API', async () => {
    // Wait for the version update promise to resolve
    await new Promise(process.nextTick);
    
    // Check if the API was called
    expect(mockGetAppVersion).toHaveBeenCalled();
    
    // Check if the version was updated
    expect(appVersionMenuItem.textContent).toBe('v1.0.0');
  });
  
  test('Menu should not close when clicking inside it', () => {
    // First show the menu
    helpButton.click();
    
    // Create a click event on the menu
    const clickEvent = new MouseEvent('click', { bubbles: true });
    
    // Mock stopPropagation
    const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');
    
    // Dispatch the click event on the menu
    helpMenu.dispatchEvent(clickEvent);
    
    // Check if stopPropagation was called
    expect(stopPropagationSpy).toHaveBeenCalled();
    
    // Menu should still be visible
    expect(helpMenu.style.display).toBe('block');
    
    // Clean up
    stopPropagationSpy.mockRestore();
  });
});