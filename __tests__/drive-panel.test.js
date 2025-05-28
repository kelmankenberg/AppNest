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
        isPackaged: false,
        requestSingleInstanceLock: jest.fn().mockReturnValue(true), // Add this
        name: 'AppNest' // Add this for electron-log
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
    },
    globalShortcut: { // Add this
        register: jest.fn(),
        unregister: jest.fn(),
        unregisterAll: jest.fn()
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
        mockElements = new Map();        // Helper function to create mock DOM element
        createMockElement = (type = 'div') => {
            const mockElement = {
                style: {},
                _title: '',
                _innerHTML: '',
                children: [],
                _classList: new Set(),
                _eventHandlers: {},
                contains: jest.fn().mockReturnValue(false),
                addEventListener: jest.fn(function(event, handler) {
                    if (!mockElement._eventHandlers[event]) {
                        mockElement._eventHandlers[event] = [];
                    }
                    mockElement._eventHandlers[event].push(handler);
                }),
                removeEventListener: jest.fn(function(event, handler) {
                    if (mockElement._eventHandlers[event]) {
                        const idx = mockElement._eventHandlers[event].indexOf(handler);
                        if (idx !== -1) {
                            mockElement._eventHandlers[event].splice(idx, 1);
                        }
                    }
                }),
                appendChild: jest.fn(function(child) {
                    this.children.push(child);
                    return child;
                }),
                dispatchEvent: jest.fn(function(event) {
                    const handlers = mockElement._eventHandlers[event.type] || [];
                    handlers.forEach(handler => handler.call(this, event));
                    return !event.defaultPrevented;
                }),
                click: jest.fn(function() {
                    this.dispatchEvent(new Event('click'));
                }),
                getBoundingClientRect: jest.fn().mockReturnValue({
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    width: 100,
                    height: 100
                }),
            };mockElement.classList = {
                add: jest.fn(function(cls) { 
                    mockElement._classList.add(cls);
                    return mockElement.classList;
                }),
                remove: jest.fn(function(cls) { 
                    mockElement._classList.delete(cls);
                    return mockElement.classList;
                }),
                contains: jest.fn(function(cls) { 
                    return mockElement._classList.has(cls); 
                }),
                toggle: jest.fn(function(cls, force) {
                    if (force === undefined) {
                        force = !mockElement._classList.has(cls);
                    }
                    if (force) {
                        mockElement._classList.add(cls);
                    } else {
                        mockElement._classList.delete(cls);
                    }
                    return force;
                }),
                has: function(cls) {
                    return mockElement._classList.has(cls);
                }
            };
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
        });        // Set up window.electronAPI with proper Jest mock functions
        const mockDriveInfo = [
            {
                letter: 'C:',
                total: 256289792000,
                free: 107374182400,
                used: 148915609600,
                percentUsed: 58
            },
            {
                letter: 'D:',
                total: 1024000000000,
                free: 512000000000,
                used: 512000000000,
                percentUsed: 50
            }
        ];

        global.window = Object.create(null);
        Object.defineProperty(global.window, 'electronAPI', {
            value: {
                openFolder: jest.fn().mockImplementation((system, letter) => Promise.resolve()),
                getDriveInfo: jest.fn().mockResolvedValue(mockDriveInfo)
            },
            writable: true,
            configurable: true
        });// Set up document with proper Jest mock functions
        global.document = {
            createElement: mockCreateElement,
            getElementById: mockGetElementById
        };
        
        // Create a mock Event class for tests
        global.Event = class Event {
            constructor(type) {
                this.type = type;
                this.bubbles = true;
            }
            stopPropagation = jest.fn();
            preventDefault = jest.fn();
        };

        // Make shared mocks available to tests
        sharedMocks = {
            createElement: mockCreateElement,
            getElementById: mockGetElementById
        };
    });    describe('getDriveInfo', () => {
        it('should parse Windows drive information correctly', async () => {
            const mockJsonOutput = JSON.stringify([
                {
                    DeviceID: 'C:',
                    Size: '256289792000',
                    FreeSpace: '107374182400'
                },
                {
                    DeviceID: 'D:',
                    Size: '1099511627776',
                    FreeSpace: '429496729600'
                }
            ]);
            
            exec.mockImplementation((command, options, callback) => {
                if (command.includes('Get-PSDrive')) {
                    callback(null, mockJsonOutput, '');
                } else {
                    callback(new Error('Unexpected command'), '', 'Command not found');
                }
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
        });        it('should handle empty or invalid drive data', async () => {            exec.mockImplementation((command, options, callback) => {
                callback(null, '[]', '');
            });

            const drives = await getDriveInfo();
            expect(drives).toHaveLength(0);
        });

        it('should handle errors in drive info retrieval', async () => {            exec.mockImplementation((command, options, callback) => {
                callback(new Error('Command failed'), '', 'Some error');
            });

            await expect(getDriveInfo()).rejects.toThrow('Command failed');
        });
    });

    describe('Drive UI Visualization', () => {
        const { createDriveIndicator } = require('../renderer/drive-panel');
        
        beforeEach(() => {
            // Reset window.electronAPI and mocks
            global.window = {
                electronAPI: {
                    openFolder: jest.fn(),
                    getDriveInfo: jest.fn().mockResolvedValue([])
                }
            };
            
            // Create a new mock element for each test
            createMockElement = (type = 'div') => {
                const mockElement = {
                    style: {},
                    _title: '',
                    _innerHTML: '',
                    children: [],
                    _classList: new Set(),
                    _eventHandlers: {},
                    contains: jest.fn().mockReturnValue(false),
                    addEventListener: jest.fn(function(event, handler) {
                        mockElement._eventHandlers[event] = handler;
                    }),
                    appendChild: jest.fn(function(child) {
                        this.children.push(child);
                        return child;
                    }),
                    classList: {
                        add: jest.fn(function(cls) { 
                            mockElement._classList.add(cls);
                            return mockElement.classList;
                        }),
                        remove: jest.fn(function(cls) { 
                            mockElement._classList.delete(cls);
                            return mockElement.classList;
                        }),
                        contains: jest.fn(function(cls) { 
                            return mockElement._classList.has(cls); 
                        }),
                        has: function(cls) {
                            return mockElement._classList.has(cls);
                        }
                    }
                };
                
                Object.defineProperty(mockElement, 'title', {
                    get() { return this._title; },
                    set(value) { this._title = value; }
                });
                
                Object.defineProperty(mockElement, 'innerHTML', {
                    get() { return this._innerHTML; },
                    set(value) { this._innerHTML = value; }
                });
                
                return mockElement;
            };
            
            // Set up document mocks
            document.createElement = jest.fn().mockImplementation(createMockElement);
            document.getElementById = jest.fn().mockImplementation((id) => {
                if (!mockElements.has(id)) {
                    mockElements.set(id, createMockElement());
                }
                return mockElements.get(id);
            });
        });

        it('should add warning class for drives over 75% full', () => {
            const mockDrive = {
                letter: 'C:',
                total: 256289792000,
                free: 53687091200,
                used: 202602700800,
                percentUsed: 79
            };

            const indicator = createDriveIndicator(mockDrive);
            const driveCircle = indicator.children[0];
            expect(driveCircle).toBeDefined();
            
            expect(driveCircle.classList.add).toHaveBeenCalledWith('warning');
            expect(driveCircle.classList.has('warning')).toBeTruthy();
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

            const indicator = createDriveIndicator(mockDrive);
            const driveCircle = indicator.children[0];
            expect(driveCircle).toBeDefined();
            
            expect(driveCircle.classList.add).toHaveBeenCalledWith('danger');
            expect(driveCircle.classList.has('danger')).toBeTruthy();
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

            const indicator = createDriveIndicator(mockDrive);
            const tooltipContent = indicator.title;
            expect(tooltipContent).toContain('238.7GB');
            expect(tooltipContent).toContain('100.0GB');
            expect(tooltipContent).toContain('138.7GB');
            expect(indicator.children[0].innerHTML).toContain('stroke-dasharray="58, 100"');
        });

        it('should toggle drive panel with expand icon click', async () => {            // Create mock elements with proper hierarchy and event handlers
            const mockDrivePanel = createMockElement();
            const mockSystemIndicator = createMockElement();
            const mockMainDrive = createMockElement();
            const mockDriveCircle = createMockElement();
            const mockExpandIcon = createMockElement();
            
            // Mock the event handler attachment
            mockExpandIcon.addEventListener = jest.fn((event, handler) => {
                mockExpandIcon._eventHandlers[event] = handler;
            });
            
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
            expect(clickHandler).toBeDefined();            // Create mock event that will be passed to the handler
            const mockEvent = new Event('click');

            // First click - turn on
            clickHandler.call(mockExpandIcon, mockEvent);
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
            expect(mockDrivePanel.classList.add).toHaveBeenCalledWith('active');
            expect(mockSystemIndicator.classList.add).toHaveBeenCalledWith('expanded');
            expect(drivePanel.isPanelActive).toBe(true);

            // Reset stopPropagation mock
            mockEvent.stopPropagation.mockClear();

            // Second click - turn off
            clickHandler.call(mockExpandIcon, mockEvent);
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
            expect(mockDrivePanel.classList.remove).toHaveBeenCalledWith('active');
            expect(mockSystemIndicator.classList.remove).toHaveBeenCalledWith('expanded');
            expect(drivePanel.isPanelActive).toBe(false);
        });
    });    describe('Drive Opening Functionality', () => {
        const { createDriveIndicator } = require('../renderer/drive-panel');
        
        beforeEach(() => {
            // Reset window.electronAPI
            global.window = {
                electronAPI: {
                    openFolder: jest.fn(),
                    getDriveInfo: jest.fn().mockResolvedValue([])
                }
            };
        });

        it('should try to open the correct drive when clicked', () => {
            const mockDrive = {
                letter: 'C:',
                total: 256289792000,
                free: 107374182400,
                used: 148915609600,
                percentUsed: 58
            };

            const indicator = createDriveIndicator(mockDrive);
            const driveCircle = indicator.children[0];
            expect(driveCircle).toBeDefined();

            // Verify event handler was added
            expect(driveCircle._eventHandlers.click).toBeDefined();
            const clickHandler = driveCircle._eventHandlers.click;

            // Create and call the handler with a mock event
            const mockEvent = new Event('click');
            clickHandler.call(driveCircle, mockEvent);

            // Verify the folder was opened
            expect(window.electronAPI.openFolder).toHaveBeenCalledWith('windows', 'c');
        });
    });

    describe('Drive Panel Loading', () => {
        beforeEach(() => {
            // Reset panel state and mocks
            drivePanel.isPanelActive = false;
            // Mock console.error
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            // Restore console.error
            console.error.mockRestore();
        });

        it('should handle errors when loading drive information', async () => {
            const error = new Error('Failed to get drive info');
            const mockDrivePanel = createMockElement();
            const mockSystemIndicator = createMockElement();
            
            // Set up mock getElementById
            document.getElementById.mockImplementation((id) => {
                if (id === 'drivePanel') return mockDrivePanel;
                if (id === 'systemDriveIndicator') return mockSystemIndicator;
                return null;
            });

            // Set up window.electronAPI to reject
            global.window.electronAPI.getDriveInfo.mockRejectedValue(error);

            await drivePanel.loadDriveInfo();
            expect(console.error).toHaveBeenCalledWith('Error loading drive information:', error);
        });

        it('should handle missing DOM elements gracefully', async () => {
            // Make getElementById return null to simulate missing elements
            document.getElementById.mockReturnValue(null);

            const error = new Error('Required DOM elements not found');
            await drivePanel.loadDriveInfo();
            expect(console.error).toHaveBeenCalledWith('Error loading drive information:', error);
        });
    });
});

describe('Drive Panel UI', () => {
    let drivePanel;
    let systemDriveIndicator;

    beforeEach(() => {
        drivePanel = createMockElement();
        systemDriveIndicator = createMockElement();
        mockElements.set('drivePanel', drivePanel);
        mockElements.set('systemDriveIndicator', systemDriveIndicator);
    });

    test('toggleDrivePanel correctly toggles panel visibility', () => {
        const { toggleDrivePanel } = require('../renderer/drive-panel');
        
        // Initial state
        expect(drivePanel.classList.contains('active')).toBe(false);
        expect(systemDriveIndicator.classList.contains('expanded')).toBe(false);
        
        // Toggle panel on
        toggleDrivePanel(drivePanel, systemDriveIndicator);
        expect(drivePanel.classList.contains('active')).toBe(true);
        expect(systemDriveIndicator.classList.contains('expanded')).toBe(true);
        
        // Toggle panel off
        toggleDrivePanel(drivePanel, systemDriveIndicator);
        expect(drivePanel.classList.contains('active')).toBe(false);
        expect(systemDriveIndicator.classList.contains('expanded')).toBe(false);
    });

    test('loadDriveInfo creates drive indicators with correct event handlers', async () => {
        const { loadDriveInfo } = require('../renderer/drive-panel');
        
        await loadDriveInfo();
        
        // Check that drive indicators were created
        const driveCircles = drivePanel.children.filter(child => 
            child.className === 'drive-indicator'
        );
        
        expect(driveCircles.length).toBeGreaterThan(0);
        
        // Test click handler on drive circle
        const firstDriveCircle = driveCircles[0].children[0];
        firstDriveCircle.click();
        
        expect(window.electronAPI.openFolder).toHaveBeenCalledWith(
            'windows',
            'c'
        );
    });

    test('loadDriveInfo handles errors gracefully', async () => {
        const { loadDriveInfo } = require('../renderer/drive-panel');
        
        // Simulate API error
        window.electronAPI.getDriveInfo.mockRejectedValueOnce(new Error('Failed to get drive info'));
        
        // Error should be caught without throwing
        await expect(loadDriveInfo()).resolves.not.toThrow();
    });

    test('drive panel updates when drive info changes', async () => {
        const { loadDriveInfo } = require('../renderer/drive-panel');
        
        // Initial drive info load
        await loadDriveInfo();
        
        // Change mock drive info
        const updatedDriveInfo = [
            {
                letter: 'C:',
                total: 256289792000,
                free: 25628979200,
                used: 230660812800,
                percentUsed: 90
            }
        ];
        
        window.electronAPI.getDriveInfo.mockResolvedValueOnce(updatedDriveInfo);
        
        // Reload drive info
        await loadDriveInfo();
        
        // Check that UI was updated with new drive info
        const systemDriveIndicator = document.getElementById('systemDriveIndicator');
        expect(systemDriveIndicator.title).toContain('90% used');
        
        const driveCircle = systemDriveIndicator.querySelector('.drive-circle');
        expect(driveCircle.classList.contains('warning')).toBe(false);
        expect(driveCircle.classList.contains('danger')).toBe(true);
    });

    test('drive indicator properly formats large drive sizes', () => {
        const { createDriveIndicator } = require('../renderer/drive-panel');
        
        const largeDrive = {
            letter: 'E:',
            total: 2199023255552, // 2 TB
            free: 1099511627776,  // 1 TB
            used: 1099511627776,  // 1 TB
            percentUsed: 50
        };
        
        const indicator = createDriveIndicator(largeDrive);
        expect(indicator.title).toContain('2048.0GB');
        expect(indicator.title).toContain('1024.0GB free');
    });
});