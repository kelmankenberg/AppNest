const { exec } = require('child_process');
const os = require('os');
const path = require('path');

// Mock database
jest.mock('../database', () => ({
    initDatabase: jest.fn().mockResolvedValue(true),
    getAllApps: jest.fn(),
    searchApplications: jest.fn(),
    addApp: jest.fn(),
    getCategories: jest.fn(),
    getApplicationById: jest.fn(),
    updateApplication: jest.fn(),
    deleteApplication: jest.fn()
}));

// Mock icon-manager
jest.mock('../icon-manager', () => ({
    getIconForApp: jest.fn(),
    extractIcon: jest.fn()
}));

// Mock electron-store
jest.mock('electron-store', () => {
    return jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn()
    }));
});

// Mock electron and its modules
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(),
        whenReady: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
        isPackaged: false
    },
    ipcMain: {
        handle: jest.fn(),
        on: jest.fn()
    },
    BrowserWindow: jest.fn(),
    screen: {
        getPrimaryDisplay: jest.fn().mockReturnValue({
            workAreaSize: {
                width: 1920,
                height: 1080
            }
        })
    },
    protocol: {
        registerFileProtocol: jest.fn(),
        registerStringProtocol: jest.fn()
    }
}));

// Mock child_process exec
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

// Mock filesystem
jest.mock('fs', () => ({
    statfsSync: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn()
}));

// Import the functions we want to test
const { getDriveInfo } = require('../main');
const drivePanel = require('../renderer/drive-panel');

describe('Drive Panel Functionality', () => {
    let sharedMocks;
    let mockElements;

    beforeEach(() => {
        // Reset Jest and clear mocks
        jest.resetModules();
        jest.clearAllMocks();
        mockElements = new Map();

        // Helper function to create mock DOM element
        const createMockElement = (type = 'div') => {
            const mockElement = {
                style: {},
                innerHTML: '',
                className: '',
                _title: '',
                children: [],
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                    contains: jest.fn()
                },
                addEventListener: jest.fn(),
                appendChild: jest.fn(function(child) {
                    this.children.push(child);
                    return child;
                })
            };

            // Add title getter/setter
            Object.defineProperty(mockElement, 'title', {
                get() { return this._title; },
                set(value) { this._title = value; }
            });

            return mockElement;
        };

        // Set up document createElement mock
        const mockCreateElement = jest.fn().mockImplementation((type) => {
            return createMockElement(type);
        });

        // Set up document getElementById mock with better control
        const mockGetElementById = jest.fn();

        // Set up window.electronAPI with proper Jest mock functions
        global.window = {
            electronAPI: {
                openFolder: jest.fn(),
                getDriveInfo: jest.fn()
            }
        };

        // Set up document with proper Jest mock functions
        global.document = {
            createElement: mockCreateElement,
            getElementById: mockGetElementById
        };

        // Make shared mocks available to tests
        sharedMocks = {
            createElement: mockCreateElement,
            getElementById: mockGetElementById
        };
    });

    describe('getDriveInfo', () => {
        it('should parse Windows drive information correctly', async () => {
            const mockWmicOutput = `
Caption  FreeSpace     Size
C:      107374182400  256289792000
D:      429496729600  1099511627776
            `.trim();

            exec.mockImplementation((command, callback) => {
                callback(null, mockWmicOutput, '');
            });

            const drives = await getDriveInfo();

            expect(drives).toHaveLength(2);
            expect(drives[0]).toEqual({
                letter: 'C:',
                total: 256289792000,
                free: 107374182400,
                used: 148915609600,
                percentUsed: 58
            });
            expect(drives[1]).toEqual({
                letter: 'D:',
                total: 1099511627776,
                free: 429496729600,
                used: 670014898176,
                percentUsed: 61
            });
        });

        it('should handle empty or invalid drive data', async () => {
            exec.mockImplementation((command, callback) => {
                callback(null, 'Caption  FreeSpace  Size\n', '');
            });

            const drives = await getDriveInfo();
            expect(drives).toHaveLength(0);
        });

        it('should handle errors in drive info retrieval', async () => {
            exec.mockImplementation((command, callback) => {
                callback(new Error('Command failed'), '', 'Some error');
            });

            await expect(getDriveInfo()).rejects.toThrow('Command failed');
        });
    });

    describe('Drive UI Visualization', () => {
        it('should add warning class for drives over 75% full', () => {
            const mockDrive = {
                letter: 'C:',
                total: 256289792000,
                free: 53687091200,
                used: 202602700800,
                percentUsed: 79
            };

            const indicator = drivePanel.createDriveIndicator(mockDrive);
            const driveCircle = indicator.children[0];
            
            expect(driveCircle.classList.add).toHaveBeenCalledWith('warning');
            expect(driveCircle.classList.add).not.toHaveBeenCalledWith('danger');
        });

        it('should add danger class for drives over 90% full', () => {
            const mockDrive = {
                letter: 'C:',
                total: 256289792000,
                free: 12814489600,
                used: 243475302400,
                percentUsed: 95
            };

            const indicator = drivePanel.createDriveIndicator(mockDrive);
            const driveCircle = indicator.children[0];
            
            expect(driveCircle.classList.add).toHaveBeenCalledWith('danger');
        });

        it('should format drive sizes in GB correctly', () => {
            const mockDrive = {
                letter: 'C:',
                total: 256289792000,
                free: 107374182400,
                used: 148915609600,
                percentUsed: 58
            };

            const indicator = drivePanel.createDriveIndicator(mockDrive);
            expect(indicator.title).toContain('238.7GB');
            expect(indicator.title).toContain('100.0GB');
            expect(indicator.title).toContain('138.7GB');
        });

        it('should toggle drive panel visibility', () => {
            const mockDrivePanel = document.createElement('div');
            const mockSystemIndicator = document.createElement('div');

            // First toggle - turn on
            drivePanel.toggleDrivePanel(mockDrivePanel, mockSystemIndicator);
            expect(mockDrivePanel.classList.add).toHaveBeenCalledWith('active');
            expect(mockSystemIndicator.classList.add).toHaveBeenCalledWith('expanded');

            // Second toggle - turn off
            drivePanel.toggleDrivePanel(mockDrivePanel, mockSystemIndicator);
            expect(mockDrivePanel.classList.remove).toHaveBeenCalledWith('active');
            expect(mockSystemIndicator.classList.remove).toHaveBeenCalledWith('expanded');
        });
    });

    describe('Drive Opening Functionality', () => {
        it('should try to open the correct drive when clicked', () => {
            const mockDrive = {
                letter: 'D:',
                total: 1099511627776,
                free: 429496729600,
                used: 670014898176,
                percentUsed: 61
            };

            const indicator = drivePanel.createDriveIndicator(mockDrive);
            const driveCircle = indicator.children[0];

            expect(driveCircle.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            
            // Call the click handler directly
            const [event, handler] = driveCircle.addEventListener.mock.calls[0];
            handler();

            expect(window.electronAPI.openFolder).toHaveBeenCalledWith('windows', 'd');
        });
    });

    describe('Drive Panel Loading', () => {
        it('should handle errors when loading drive information', async () => {
            const error = new Error('Failed to get drive info');
            const consoleError = jest.spyOn(console, 'error').mockImplementation();
            
            // Override getDriveInfo mock to reject
            window.electronAPI.getDriveInfo.mockRejectedValueOnce(error);
            
            await drivePanel.loadDriveInfo();
            
            expect(consoleError).toHaveBeenCalledWith('Error loading drive information:', error);
            consoleError.mockRestore();
        });

        it('should handle missing DOM elements gracefully', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation();
            
            // Make getElementById return null for required elements
            document.getElementById.mockReturnValue(null);
            
            await drivePanel.loadDriveInfo();
            
            expect(consoleError).toHaveBeenCalledWith(
                'Error loading drive information:',
                new Error('Required DOM elements not found')
            );
            consoleError.mockRestore();
        });
    });
});