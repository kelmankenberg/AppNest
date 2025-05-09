// Variables for drive panel functionality
let isPanelActive = false;

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
    driveCircle.style.cursor = 'pointer';
    
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
    
    // Add click event to open the drive in the system file manager
    driveCircle.addEventListener('click', () => {
        window.electronAPI.openFolder('windows', drive.letter.charAt(0).toLowerCase());
    });

    driveIndicator.appendChild(driveCircle);
    return driveIndicator;
}

// Function to toggle the drive panel
function toggleDrivePanel(drivePanel, systemDriveIndicator) {
    isPanelActive = !isPanelActive;
    
    if (isPanelActive) {
        drivePanel.classList.add('active');
        systemDriveIndicator.classList.add('expanded');
    } else {
        drivePanel.classList.remove('active');
        systemDriveIndicator.classList.remove('expanded');
    }
}

// Function to load and display drive information
async function loadDriveInfo() {
    try {
        const drives = await window.electronAPI.getDriveInfo();
        const systemDriveIndicator = document.getElementById('systemDriveIndicator');
        const drivePanel = document.getElementById('drivePanel');
        
        if (!systemDriveIndicator || !drivePanel) {
            throw new Error('Required DOM elements not found');
        }

        // Find the system drive (usually C:)
        const systemDrive = drives.find(drive => drive.letter === 'C:') || drives[0];
        
        // Clear the system drive indicator
        systemDriveIndicator.innerHTML = '';
        
        // Create the main system drive indicator with just the circle visualization
        const mainDriveCircle = document.createElement('div');
        mainDriveCircle.className = 'drive-circle';
        mainDriveCircle.style.cursor = 'pointer';
        
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
        
        // Add click event to open the drive
        mainDriveCircle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent panel toggle
            window.electronAPI.openFolder('windows', systemDrive.letter.charAt(0).toLowerCase());
        });
        
        // Create main drive display with expand icon
        const mainDrive = document.createElement('div');
        mainDrive.className = 'main-drive';
        mainDrive.appendChild(mainDriveCircle);
        
        // Add expand icon
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        expandIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Only trigger panel toggle
            toggleDrivePanel(drivePanel, systemDriveIndicator);
        });
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
    } catch (err) {
        console.error('Error loading drive information:', err);
    }
}

module.exports = {
    createDriveIndicator,
    toggleDrivePanel,
    loadDriveInfo,
    isPanelActive
};