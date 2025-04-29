// Load applications from the database
function loadApplications() {
    window.electronAPI.getAllApps().then(apps => {
        displayApplications(apps);
    }).catch(err => {
        console.error('Error loading applications:', err);
    });
}

// Function to display applications in the table
function displayApplications(apps) {
    const tableBody = document.querySelector('.app-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows
    
    if (apps.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="1" class="no-apps">No applications found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    apps.forEach(app => {
        const row = document.createElement('tr');
        row.className = 'app-row';
        row.dataset.appId = app.id;
        
        // Create app name cell
        const nameCell = document.createElement('td');
        nameCell.textContent = app.name;
        row.appendChild(nameCell);
        
        // Add click event to launch the application
        row.addEventListener('click', () => {
            launchApplication(app.id);
        });

        // Add right-click event for context menu
        row.addEventListener('contextmenu', (e) => {
            showContextMenu(e, app.id);
        });
        
        tableBody.appendChild(row);
    });
}

// Launch an application
function launchApplication(appId) {
    window.electronAPI.launchApp(appId).then(() => {
        console.log(`Launched application ${appId}`);
    }).catch(err => {
        console.error(`Error launching application ${appId}:`, err);
    });
}

// Power and close button handlers
document.querySelector('button[title="Power"]').addEventListener('click', () => {
    window.electronAPI.quitApp();
});

document.querySelector('button[title="Close"]').addEventListener('click', () => {
    window.electronAPI.quitApp();
});

// Variables for drive panel functionality
let isPanelActive = false;
const systemDriveIndicator = document.getElementById('systemDriveIndicator');
const drivePanel = document.getElementById('drivePanel');

// Function to load and display drive information
function loadDriveInfo() {
    window.electronAPI.getDriveInfo().then(drives => {
        // Find the system drive (usually C:)
        let systemDrive = drives.find(drive => drive.letter === 'C:') || drives[0];
        
        // Clear the system drive indicator
        systemDriveIndicator.innerHTML = '';
        
        // Create the main system drive indicator with just the circle visualization
        const mainDriveCircle = document.createElement('div');
        mainDriveCircle.className = 'drive-circle';
        
        // Add color coding based on usage percentage
        if (systemDrive.percentUsed >= 90) {
            mainDriveCircle.classList.add('danger');
        } else if (systemDrive.percentUsed >= 75) {
            mainDriveCircle.classList.add('warning');
        }
        
        // Format size for tooltip
        const totalGB = (systemDrive.total / (1024 * 1024 * 1024)).toFixed(1);
        const usedGB = (systemDrive.used / (1024 * 1024 * 1024)).toFixed(1);
        const freeGB = (systemDrive.free / (1024 * 1024 * 1024)).toFixed(1);
        
        // Set tooltip for the system drive indicator
        systemDriveIndicator.title = `${systemDrive.letter} - ${systemDrive.percentUsed}% used (${usedGB}GB of ${totalGB}GB, ${freeGB}GB free)`;
        
        // Create SVG for the system drive circle
        mainDriveCircle.innerHTML = `
            <svg viewBox="0 0 36 36">
                <path class="circle-bg"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="circle-fill"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    stroke-dasharray="${systemDrive.percentUsed}, 100"/>
            </svg>
            <span class="drive-letter">${systemDrive.letter.replace(':', '')}</span>
        `;
        
        // Create main drive display with expand icon
        const mainDrive = document.createElement('div');
        mainDrive.className = 'main-drive';
        mainDrive.appendChild(mainDriveCircle);
        
        // Add expand icon
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        mainDrive.appendChild(expandIcon);
        
        // Add main drive to system drive indicator
        systemDriveIndicator.appendChild(mainDrive);
        
        // Clear the drive panel
        drivePanel.innerHTML = '';
        
        // Add all drives to the panel
        drives.forEach(drive => {
            const driveIndicator = createDriveIndicator(drive);
            drivePanel.appendChild(driveIndicator);
        });
    }).catch(err => {
        console.error('Error loading drive information:', err);
    });
}

// Function to create a drive indicator element
function createDriveIndicator(drive) {
    // Format size for the tooltip
    const totalGB = (drive.total / (1024 * 1024 * 1024)).toFixed(1);
    const usedGB = (drive.used / (1024 * 1024 * 1024)).toFixed(1);
    const freeGB = (drive.free / (1024 * 1024 * 1024)).toFixed(1);
    
    // Create drive indicator element
    const driveIndicator = document.createElement('div');
    driveIndicator.className = 'drive-indicator';
    driveIndicator.title = `${drive.letter} - ${drive.percentUsed}% used (${usedGB}GB of ${totalGB}GB, ${freeGB}GB free)`;
    
    // Create drive circle element
    const driveCircle = document.createElement('div');
    driveCircle.className = 'drive-circle';
    
    // Add color coding based on usage percentage
    if (drive.percentUsed >= 90) {
        driveCircle.classList.add('danger');
    } else if (drive.percentUsed >= 75) {
        driveCircle.classList.add('warning');
    }
    
    // Create SVG for the circle
    driveCircle.innerHTML = `
        <svg viewBox="0 0 36 36">
            <path class="circle-bg"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="circle-fill"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                stroke-dasharray="${drive.percentUsed}, 100"/>
        </svg>
        <span class="drive-letter">${drive.letter.replace(':', '')}</span>
    `;
    
    driveIndicator.appendChild(driveCircle);
    return driveIndicator;
}

// Function to toggle the drive panel
function toggleDrivePanel() {
    isPanelActive = !isPanelActive;
    
    if (isPanelActive) {
        drivePanel.classList.add('active');
        systemDriveIndicator.classList.add('expanded');
    } else {
        drivePanel.classList.remove('active');
        systemDriveIndicator.classList.remove('expanded');
    }
}

// Add click event to toggle the drive panel
systemDriveIndicator.addEventListener('click', toggleDrivePanel);

// Close the drive panel when clicking elsewhere
document.addEventListener('click', (e) => {
    if (isPanelActive && 
        !systemDriveIndicator.contains(e.target) && 
        !drivePanel.contains(e.target)) {
        isPanelActive = false;
        drivePanel.classList.remove('active');
        systemDriveIndicator.classList.remove('expanded');
    }
});

// Menu handlers for Apps and Options
const appsButton = document.getElementById('appsButton');
const optionsButton = document.getElementById('optionsButton');
const appsMenu = document.getElementById('appsMenu');
const optionsMenu = document.getElementById('optionsMenu');

appsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close options menu if it's open
    optionsMenu.style.display = 'none';
    
    // Toggle apps menu
    const isVisible = appsMenu.style.display === 'block';
    appsMenu.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // Position the menu relative to the button
        const buttonRect = appsButton.getBoundingClientRect();
        appsMenu.style.top = buttonRect.bottom + 'px';
        appsMenu.style.right = (window.innerWidth - buttonRect.right) + 'px';
    }
});

optionsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close apps menu if it's open
    appsMenu.style.display = 'none';
    
    // Toggle options menu
    const isVisible = optionsMenu.style.display === 'block';
    optionsMenu.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // Position the menu relative to the button
        const buttonRect = optionsButton.getBoundingClientRect();
        optionsMenu.style.top = buttonRect.bottom + 'px';
        optionsMenu.style.right = (window.innerWidth - buttonRect.right) + 'px';
    }
});

// Function to close all menus
function closeAllMenus() {
    appsMenu.style.display = 'none';
    optionsMenu.style.display = 'none';
}

// Close menus when clicking elsewhere
document.addEventListener('click', closeAllMenus);

// Prevent menu from closing when clicking inside it
appsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

optionsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Theme toggle and initialization
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    // Toggle the theme
    document.body.classList.toggle('dark-theme');
    
    // Check if we're currently in dark theme after toggling
    const isNowDarkTheme = document.body.classList.contains('dark-theme');
    
    // Save the theme setting
    window.electronAPI.setTheme(isNowDarkTheme ? 'dark' : 'light')
        .catch(err => console.error('Error saving theme:', err));
    
    // Update button to show what it would switch to (not the current theme)
    const nextTheme = isNowDarkTheme ? 'Light' : 'Dark';
    const nextIcon = isNowDarkTheme ? 'fa-sun' : 'fa-moon';
    
    themeToggle.innerHTML = `<i class="fas ${nextIcon}"></i> Theme: ${nextTheme}`;
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadApplications();
    loadDriveInfo();
    
    // Load saved theme
    window.electronAPI.getTheme()
        .then(theme => {
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i> Theme: Light';
            }
        })
        .catch(err => {
            console.error('Error loading theme:', err);
        });
    
    // Set up interval to refresh drive info every minute
    setInterval(loadDriveInfo, 60000);
});