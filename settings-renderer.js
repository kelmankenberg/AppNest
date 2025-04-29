// When DOM is loaded, initialize settings window functionality
document.addEventListener('DOMContentLoaded', () => {
    initializeTitleBarButtons();
    initializeSettingsNavigation();
    initializeThemeSettings();
    initializeSliders();
    initializeInputs();
    initializeThemeChangeListener();
    loadSettingsFromStore();
});

// Initialize titlebar buttons
function initializeTitleBarButtons() {
    const closeButton = document.getElementById('closeSettings');
    const resetButton = document.getElementById('resetSettings');
    
    if (closeButton) {
        closeButton.addEventListener('click', closeWindow);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetToDefaults);
    }
}

// Initialize settings navigation
function initializeSettingsNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const settingsSections = document.querySelectorAll('.settings-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show the corresponding section
            const section = item.getAttribute('data-section');
            settingsSections.forEach(settingsSection => {
                settingsSection.classList.remove('active');
            });
            document.getElementById(section).classList.add('active');
        });
    });
}

// Initialize theme settings with immediate saving
function initializeThemeSettings() {
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all options
            themeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            option.classList.add('active');
            
            // Get the theme value
            const theme = option.getAttribute('data-theme');
            
            // Update visual preview by applying theme to body
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
            
            // Save immediately and sync with main window
            window.electronAPI.setTheme(theme)
                .catch(err => console.error('Error saving theme:', err));
                
            // Sync the theme change to the main app
            window.electronAPI.syncTheme(theme);
        });
    });
}

// Listen for theme changes from the main app
function initializeThemeChangeListener() {
    window.electronAPI.onThemeChanged((theme) => {
        // Update visual state
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // Update theme options UI
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.toggle('active', option.getAttribute('data-theme') === theme);
        });
    });
}

// Initialize slider controls with immediate saving
function initializeSliders() {
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    
    if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.addEventListener('input', () => {
            const value = fontSizeSlider.value;
            fontSizeValue.textContent = `${value}px`;
        });
        
        fontSizeSlider.addEventListener('change', () => {
            // Save the value when slider stops (mouseup)
            const value = fontSizeSlider.value;
            // Implement font size saving when API is available
            // window.electronAPI.setFontSize(value)
            //    .catch(err => console.error('Error saving font size:', err));
        });
    }
}

// Initialize input controls with immediate saving
function initializeInputs() {
    // App name input
    const appNameInput = document.getElementById('appName');
    if (appNameInput) {
        appNameInput.addEventListener('change', () => {
            const value = appNameInput.value;
            // Implement app name saving when API is available
            // window.electronAPI.setAppName(value)
            //    .catch(err => console.error('Error saving app name:', err));
        });
    }
    
    // Start with Windows toggle
    const startWithWindows = document.getElementById('startWithWindows');
    if (startWithWindows) {
        startWithWindows.addEventListener('change', () => {
            const enabled = startWithWindows.checked;
            // Implement auto-start setting when API is available
            // window.electronAPI.setAutoStart(enabled)
            //    .catch(err => console.error('Error saving auto-start setting:', err));
        });
    }
    
    // Default view selector
    const defaultView = document.getElementById('defaultView');
    if (defaultView) {
        defaultView.addEventListener('change', () => {
            const value = defaultView.value;
            // Implement default view saving when API is available
            // window.electronAPI.setDefaultView(value)
            //    .catch(err => console.error('Error saving default view:', err));
        });
    }
    
    // Search mode selector
    const searchMode = document.getElementById('searchMode');
    if (searchMode) {
        searchMode.addEventListener('change', () => {
            const value = searchMode.value;
            // Implement search mode saving when API is available
            // window.electronAPI.setSearchMode(value)
            //    .catch(err => console.error('Error saving search mode:', err));
        });
    }
}

// Load settings from electron-store
function loadSettingsFromStore() {
    // Load theme
    window.electronAPI.getTheme()
        .then(theme => {
            // Apply theme to window
            applyTheme(theme);
            
            // Set the active theme option
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.classList.toggle('active', option.getAttribute('data-theme') === theme);
            });
        })
        .catch(err => {
            console.error('Error loading theme setting:', err);
        });
        
    // Load other settings when they're implemented
}

// Apply theme to the settings window
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// Reset all settings to defaults
function resetToDefaults() {
    if (confirm('Reset all settings to default values?')) {
        // Reset theme to light and save immediately
        document.body.classList.remove('dark-theme');
        window.electronAPI.setTheme('light')
            .catch(err => console.error('Error saving theme:', err));
        
        // Sync the theme change to the main app
        window.electronAPI.syncTheme('light');
        
        // Update theme options UI
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.toggle('active', option.getAttribute('data-theme') === 'light');
        });
        
        // Reset font size slider
        const fontSizeSlider = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider && fontSizeValue) {
            fontSizeSlider.value = 16;
            fontSizeValue.textContent = '16px';
            // Save when API is available
            // window.electronAPI.setFontSize(16)
            //    .catch(err => console.error('Error saving font size:', err));
        }
        
        // Reset other settings to their defaults
        // App name
        const appNameInput = document.getElementById('appName');
        if (appNameInput) {
            appNameInput.value = 'MyPAs Launcher';
            // Save when API is available
        }
        
        // Start with Windows toggle
        const startWithWindows = document.getElementById('startWithWindows');
        if (startWithWindows) {
            startWithWindows.checked = false;
            // Save when API is available
        }
        
        // Default view
        const defaultView = document.getElementById('defaultView');
        if (defaultView) {
            defaultView.value = 'all';
            // Save when API is available
        }
        
        // Search mode
        const searchMode = document.getElementById('searchMode');
        if (searchMode) {
            searchMode.value = 'name';
            // Save when API is available
        }
    }
}

// Close the settings window
function closeWindow() {
    window.close();
}