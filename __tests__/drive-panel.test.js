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
    let createMockElement;

    beforeEach(() => {
        // Reset Jest and clear mocks
        jest.resetModules();
        jest.clearAllMocks();
        mockElements = new Map();

        // Helper function to create mock DOM element
        createMockElement = (type = 'div') => {
            const mockElement = {
                style: {},
                _title: '',
                _innerHTML: '',
                children: [],
                _classList: new Set(),
                _eventHandlers: {},
                addEventListener: jest.fn(function(event, handler) {
                    mockElement._eventHandlers[event] = handler;
                }),
                appendChild: jest.fn(function(child) {
                    this.children.push(child);
                    return child;
                }),
            };
            Object.defineProperty(mockElement, 'classList', {
                value: {
                    add: jest.fn(function(cls) { mockElement._classList.add(cls); }),
                    remove: jest.fn(function(cls) { mockElement._classList.delete(cls); }),
                    contains: jest.fn(function(cls) { return mockElement._classList.has(cls); }),
                },
                writable: false,
                configurable: false,
                enumerable: true
            });
            Object.defineProperty(mockElement, 'title', {
                get() { return this._title; },
                set(value) { this._title = value; }
            });
            Object.defineProperty(mockElement, 'innerHTML', {
                get() { return this._innerHTML; },
                set(value) { this._innerHTML = value; this.children = []; }
            });
            Object.defineProperty(mockElement, 'className', {
                get() { return Array.from(this._classList).join(' '); },
                set(value) {
                    this._classList.clear();
                    value.split(' ').forEach(cls => this._classList.add(cls));
                }
            });
            return mockElement;
        };

        // Set up document createElement mock
        const mockCreateElement = jest.fn().mockImplementation((type) => {
            return createMockElement(type);
        });

        // Set up document getElementById mock with better control
        const mockGetElementById = jest.fn().mockImplementation((id) => {
            if (!mockElements.has(id)) {
                mockElements.set(id, createMockElement());
            }
            return mockElements.get(id);
        });

        // Set up window.electronAPI with proper Jest mock functions
        global.window = {
            electronAPI: {
                openFolder: jest.fn(),
                getDriveInfo: jest.fn().mockResolvedValue([
                    {
                        letter: 'C:',
                        total: 256289792000,
                        free: 107374182400,
                        used: 148915609600,
                        percentUsed: 58
                    }
                ])
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
        beforeEach(() => {
            // Reset panel state before each test
            drivePanel.isPanelActive = false;
        });

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
            expect(driveCircle.innerHTML).toContain('stroke-dasharray="79, 100"');
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
            expect(driveCircle.innerHTML).toContain('stroke-dasharray="95, 100"');
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
            expect(indicator.children[0].innerHTML).toContain('stroke-dasharray="58, 100"');
        });

        it('should toggle drive panel with expand icon click', async () => {
            // Create mock elements with proper hierarchy
            const mockDrivePanel = createMockElement();
            const mockSystemIndicator = createMockElement();
            const mockMainDrive = createMockElement();
            const mockDriveCircle = createMockElement();
            const mockExpandIcon = createMockElement();
            
            mockMainDrive.className = 'main-drive';
            mockExpandIcon.className = 'expand-icon';
            mockExpandIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
            
            // Set up the element hierarchy
            mockMainDrive.appendChild(mockDriveCircle);
            mockMainDrive.appendChild(mockExpandIcon);
            mockSystemIndicator.appendChild(mockMainDrive);

            // Set up required DOM elements
            document.getElementById = jest.fn().mockImplementation((id) => {
                if (id === 'drivePanel') return mockDrivePanel;
                if (id === 'systemDriveIndicator') return mockSystemIndicator;
                return null;
            });

            // Set up window.electronAPI for this test
            global.window = {
                electronAPI: {
                    openFolder: jest.fn(),
                    getDriveInfo: jest.fn().mockResolvedValue([
                        {
                            letter: 'C:',
                            total: 256289792000,
                            free: 107374182400,
                            used: 148915609600,
                            percentUsed: 58
                        }
                    ])
                }
            };

            await drivePanel.loadDriveInfo();

            // Get the click handler from the mock element
            const clickHandler = mockExpandIcon._eventHandlers.click;
            expect(clickHandler).toBeDefined();

            // Create mock event object
            const mockEvent = {
                stopPropagation: jest.fn()
            };

            // First click - turn on
            clickHandler(mockEvent);
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
            expect(mockDrivePanel.classList.add).toHaveBeenCalledWith('active');
            expect(mockSystemIndicator.classList.add).toHaveBeenCalledWith('expanded');
            expect(drivePanel.isPanelActive).toBe(true);

            // Second click - turn off
            clickHandler(mockEvent);
            expect(mockDrivePanel.classList.remove).toHaveBeenCalledWith('active');
            expect(mockSystemIndicator.classList.remove).toHaveBeenCalledWith('expanded');
            expect(drivePanel.isPanelActive).toBe(false);
        });
    });

    describe('Drive Opening Functionality', () => {
        it('should try to open the correct drive when clicked', () => {
            const mockDrive = {
                letter: 'C:',
                total: 256289792000,
                free: 107374182400,
                used: 148915609600,
                percentUsed: 58
            };

            const indicator = drivePanel.createDriveIndicator(mockDrive);
            const driveCircle = indicator.children[0];

            // Get the click handler from the mock element
            const clickHandler = driveCircle._eventHandlers.click;
            expect(clickHandler).toBeDefined();
            
            // Create mock event object
            const mockEvent = {
                stopPropagation: jest.fn()
            };
            clickHandler(mockEvent);

            expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
            expect(window.electronAPI.openFolder).toHaveBeenCalledWith('windows', 'c');
            expect(driveCircle.innerHTML).toContain('stroke-dasharray="58, 100"');
        });
    });

    describe('Drive Panel Loading', () => {
        const error = new Error('Failed to get drive info');
        beforeEach(() => {
            // Reset panel state
            drivePanel.isPanelActive = false;
            // Reset window.electronAPI for each test
            global.window = {
                electronAPI: {
                    openFolder: jest.fn(),
                    getDriveInfo: jest.fn().mockRejectedValueOnce(error)
                }
            };
        });

        it('should handle errors when loading drive information', async () => {
            // Set up required DOM elements
            const mockDrivePanel = createMockElement();
            const mockSystemIndicator = createMockElement();
            document.getElementById = jest.fn().mockImplementation((id) => {
                if (id === 'drivePanel') return mockDrivePanel;
                if (id === 'systemDriveIndicator') return mockSystemIndicator;
                return null;
            });
            await drivePanel.loadDriveInfo();
            // Test passes if no error is thrown
        });

        it('should handle missing DOM elements gracefully', async () => {
            // Make getElementById return null for required elements
            document.getElementById = jest.fn().mockReturnValue(null);
            // Set up window.electronAPI to a valid mock for this test
            global.window = {
                electronAPI: {
                    openFolder: jest.fn(),
                    getDriveInfo: jest.fn().mockResolvedValue([])
                }
            };
            await drivePanel.loadDriveInfo();
            // Test passes if no error is thrown
        });
    });
});