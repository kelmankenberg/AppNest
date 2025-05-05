// Help menu functionality

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the Help menu
    initializeHelpMenu();
});

/**
 * Initialize the Help menu functionality
 */
function initializeHelpMenu() {
    // Get the menu elements
    const helpButton = document.getElementById('helpButton');
    const helpMenu = document.getElementById('helpMenu');
    const helpMenuItem = document.getElementById('helpMenuItem');
    const releaseNotesMenuItem = document.getElementById('releaseNotesMenuItem');
    const aboutMenuItem = document.getElementById('aboutMenuItem');
    
    if (!helpButton || !helpMenu) {
        console.error('Help menu elements not found');
        return;
    }

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
    if (helpMenuItem) {
        helpMenuItem.addEventListener('click', () => {
            helpMenu.style.display = 'none';
            // Show help content (to be implemented)
            showHelp();
        });
    }

    // Handle Release Notes button click
    if (releaseNotesMenuItem) {
        releaseNotesMenuItem.addEventListener('click', () => {
            helpMenu.style.display = 'none';
            // Show release notes (to be implemented)
            showReleaseNotes();
        });
    }

    // Handle About button click
    if (aboutMenuItem) {
        aboutMenuItem.addEventListener('click', () => {
            helpMenu.style.display = 'none';
            // Show about dialog (to be implemented)
            showAboutDialog();
        });
    }

    // Update the version number from package.json
    updateVersionNumber();
}

/**
 * Update the version number in the Help menu
 */
async function updateVersionNumber() {
    try {
        const appVersionMenuItem = document.getElementById('appVersionMenuItem');
        if (!appVersionMenuItem) return;

        // Get app version from the electronAPI
        if (window.electronAPI && window.electronAPI.getAppVersion) {
            const version = await window.electronAPI.getAppVersion();
            appVersionMenuItem.textContent = `v${version}`;
        }
    } catch (error) {
        console.error('Error getting app version:', error);
    }
}

/**
 * Show the Help documentation
 */
function showHelp() {
    if (window.electronAPI && window.electronAPI.openHelpWindow) {
        window.electronAPI.openHelpWindow();
    } else {
        console.error('Help window API not found');
        alert('Help documentation is coming soon!');
    }
}

/**
 * Show the Release Notes
 */
function showReleaseNotes() {
    // Display the release notes modal
    if (window.releaseNotesModal) {
        window.releaseNotesModal.show();
    } else {
        console.error('Release notes modal not found');
        alert('Release Notes are coming soon!');
    }
}

/**
 * Show the About dialog
 */
function showAboutDialog() {
    // To be implemented - could show an about dialog with app info
    console.log('Show About dialog clicked');
    
    const aboutInfo = `
AppNest
All Your Apps, One Nest
    
Version: ${document.getElementById('appVersionMenuItem').textContent}
Author: Kel Mankenberg

AppNest is designed to work in harmony with the Windows Start menu 
or as a standalone launcher. Its goal is to provide a seamless, 
efficient way to launch both installed and portable applications, 
enhancing workflow and organization for all types of users.
    `;
    
    alert(aboutInfo);
}