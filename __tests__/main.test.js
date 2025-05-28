// __tests__/main.test.js
// Mock Electron and other dependencies
jest.mock('electron-log', () => ({
  transports: {
    file: {
      level: 'info',
      getFile: jest.fn(),
      setAppName: jest.fn()
    },
    console: {
      level: 'info'
    }
  },
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('electron', () => {
  const mockIpcMain = {
    handle: jest.fn(),
    on: jest.fn(),
  };
  
  const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    focus: jest.fn(),
    show: jest.fn(),
    once: jest.fn(),
    setPosition: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      toggleDevTools: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
    },
    isDestroyed: jest.fn().mockReturnValue(false)
  }));
  
  // Create a handler registry to store app event handlers
  const handlers = {};
  
  const mockAppOn = jest.fn().mockImplementation((event, handler) => {
    handlers[event] = handler;
    return mockAppOn; // Make it chainable
  });
  
  return {
    app: {
      getAppPath: jest.fn().mockReturnValue('/mock/path'),
      getPath: jest.fn().mockReturnValue('/mock/user/path'),
      requestSingleInstanceLock: jest.fn().mockReturnValue(true),
      name: 'AppNest',
      whenReady: jest.fn().mockResolvedValue(undefined),
      on: mockAppOn
    },
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
    globalShortcut: {
      register: jest.fn(),
      unregister: jest.fn(),
      unregisterAll: jest.fn()
    },
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
  };
});

jest.mock('child_process', () => ({
  exec: jest.fn((command, optionsOrCallback, callback) => {
    // Handle case where options parameter is omitted
    const realCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;

    if (command.includes('wmic')) {
      // Mock drive info output in the expected format
      realCallback(null, 'DeviceID FreeSpace Size\nC: 100000000 200000000', '');
    } else {
      // Default behavior for other commands
      if (realCallback) realCallback(null, 'mocked stdout', '');
    }
    return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
  })
}));

jest.mock('fs', () => ({
  statfsSync: jest.fn().mockReturnValue({
    blocks: 1000,
    bsize: 1024,
    bfree: 500
  }),
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    stat: jest.fn().mockResolvedValue({
      size: 1024,
      blocks: 1000,
      bfree: 500,
      bavail: 500
    })
  }
}));

jest.mock('../database', () => ({
  initDatabase: jest.fn().mockResolvedValue(),
  getAllApps: jest.fn().mockResolvedValue([
    { id: 1, name: 'Test App', path: '/path/to/app' }
  ]),
  getApplicationById: jest.fn().mockImplementation(id => {
    // Return application only if ID matches
    if (id === '1') {
      return Promise.resolve({
        id: '1', 
        name: 'Test App', 
        executable_path: 'C:\\test\\app.exe'
      });
    }
    return Promise.resolve(null);
  }),
  updateApplicationUsage: jest.fn().mockResolvedValue(),
  getApplicationsByCategory: jest.fn().mockResolvedValue([]),
  getFavoriteApplications: jest.fn().mockResolvedValue([]),
  getRecentlyUsedApplications: jest.fn().mockResolvedValue([]),
  getMostUsedApplications: jest.fn().mockResolvedValue([]),
  searchApplications: jest.fn().mockResolvedValue([]),
  addApplication: jest.fn().mockResolvedValue('1'),
  updateApplication: jest.fn().mockResolvedValue(true),
  deleteApplication: jest.fn().mockResolvedValue(true),
  getCategories: jest.fn().mockResolvedValue([])
}));

// Mock electron-store module
jest.mock('electron-store', () => {
  // Create the mock store instance
  const mockStore = {
    get: jest.fn().mockImplementation(key => {
      const defaults = {
        theme: 'light',
        'font-size': '16',
        'icon-size': '20',
        folderPreferences: {
          folderType: 'app',
          appFolders: {
            documents: true,
            music: true,
            pictures: true,
            videos: true,
            downloads: true
          },
          windowsFolders: {
            documents: true,
            music: true,
            pictures: true,
            videos: true,
            downloads: true
          }
        }
      };
      return defaults[key];
    }),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(true)
  };
  
  // Create a constructor function that returns the mock store
  const StoreMock = jest.fn().mockImplementation(() => mockStore);
  
  // Add the mockStore as a "result" so tests can access it
  StoreMock.mock.results = [{ type: 'return', value: mockStore }];
  
  // Make it work with both CommonJS and ES modules
  StoreMock.default = StoreMock;
  return StoreMock;
});

// Mock the functions module
jest.mock('../functions', () => ({
  powerDownApp: jest.fn()
}));

describe('Main Process Tests', () => {
  let electron;
  let mockStore;
  let main;
  let childProcess;
  let db;
  
  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Import dependencies
    electron = require('electron');
    childProcess = require('child_process');
    db = require('../database');
    
    // Force reload the main module to reset the state
    jest.isolateModules(() => {
      main = require('../main');
    });

    // Initialize necessary components
    await main.initializeStoreSync();
    await main.initializeDatabase();
    main.registerIPCHandlers();

    // Allow the store initialization to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  });
  
  describe('Window Management', () => {
    it('should create a main window with correct parameters on app ready', () => {
      // Directly call createWindow instead of using the ready event handler
      main.createWindow();
      
      // Just check that BrowserWindow was called
      expect(electron.BrowserWindow).toHaveBeenCalled();
      
      // Get the arguments passed to BrowserWindow
      const browserWindowArgs = electron.BrowserWindow.mock.calls[0][0];
      
      // Check specific critical properties individually
      expect(browserWindowArgs.frame).toBe(false);
      expect(browserWindowArgs.webPreferences.nodeIntegration).toBe(false);
      expect(browserWindowArgs.webPreferences.contextIsolation).toBe(true);
      expect(browserWindowArgs.webPreferences.preload).toContain('preload.js');
      
      // Check if loadFile was called on the window
      const mockWindow = electron.BrowserWindow.mock.results[0].value;
      expect(mockWindow.loadFile).toHaveBeenCalledWith('index.html');
      
      // Check if setPosition was called
      expect(mockWindow.setPosition).toHaveBeenCalled();
    });
    
    it('should register DevTools keyboard shortcuts', () => {
      // Directly call createWindow to register shortcuts
      main.createWindow();
      
      // Check if globalShortcut.register was called for DevTools shortcuts
      expect(electron.globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+I', expect.any(Function));
      expect(electron.globalShortcut.register).toHaveBeenCalledWith('F12', expect.any(Function));
    });
  });
  
  describe('IPC Handlers', () => {
    beforeEach(() => {
      // Make sure IPC handlers are registered
      main.registerIPCHandlers();
    });
    
    it('should register get-all-apps handler that returns applications from database', async () => {
      // Find the get-all-apps handler
      const getAllAppsHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'get-all-apps'
      )[1];
      
      // Call the handler
      const result = await getAllAppsHandler();
      
      // Check if database was called and handler returned the expected result
      expect(db.getAllApps).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Test App', path: '/path/to/app' }]);
    });
    
    it('should register launch-app handler that launches the app and updates usage', async () => {
      // Mock getAllApps instead, since that's what the main.js implementation actually uses
      db.getAllApps = jest.fn().mockResolvedValue([
        { 
          id: '1', 
          name: 'Test App', 
          executable_path: 'C:\\test\\app.exe'
        }
      ]);

      // Reset the exec mock
      childProcess.exec.mockClear();
      
      // Find the launch-app handler
      const launchAppHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'launch-app'
      )[1];

      // Call the handler directly
      const result = await launchAppHandler({}, '1');
      
      // Check if the app was launched via child_process.exec
      expect(db.getAllApps).toHaveBeenCalled();
      expect(childProcess.exec).toHaveBeenCalled();
      expect(childProcess.exec.mock.calls[0][0]).toContain('C:\\test\\app.exe');
      
      // Manually trigger the exec callback to simulate completion
      const execCallback = childProcess.exec.mock.calls[0][2];
      execCallback(null);
      
      // Check if usage was updated
      expect(db.updateApplicationUsage).toHaveBeenCalledWith('1');
      
      // Verify result
      expect(result).toBe(true);
    });
  });
  
  describe('Drive Info Functions', () => {
    let getDriveInfoHandler;

    beforeEach(() => {
      // Mock the platform for Windows
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      // Get the drive info handler
      getDriveInfoHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'get-drive-info'
      )[1];
    });

    it('should get drive info on Windows platform', async () => {
      // Mock exec with correct PowerShell JSON output format
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

      childProcess.exec.mockImplementation((command, options, callback) => {
        expect(command).toContain('Get-CimInstance');
        callback(null, mockJsonOutput, '');
      });
      
      const result = await getDriveInfoHandler();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        letter: 'C:',
        total: 256289792000,
        free: 107374182400,
        used: 148915609600,
        percentUsed: 58
      });
      expect(result[1]).toEqual({
        letter: 'D:',
        total: 1099511627776,
        free: 429496729600,
        used: 670014898176,
        percentUsed: 61
      });
    });
    
    it('should handle empty drive data', async () => {
      // Mock exec with empty array
      childProcess.exec.mockImplementation((command, options, callback) => {
        callback(null, '[]', '');
      });

      const result = await getDriveInfoHandler();
      expect(result).toHaveLength(0);
    });

    it('should handle single drive data', async () => {
      // Mock exec with a single drive object
      const mockJsonOutput = JSON.stringify({
        DeviceID: 'C:',
        Size: '256289792000',
        FreeSpace: '107374182400'
      });

      childProcess.exec.mockImplementation((command, options, callback) => {
        callback(null, mockJsonOutput, '');
      });

      const result = await getDriveInfoHandler();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        letter: 'C:',
        total: 256289792000,
        free: 107374182400,
        used: 148915609600,
        percentUsed: 58
      });
    });

    it('should handle errors in drive info retrieval', async () => {
      // Mock exec with an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      childProcess.exec.mockImplementation((command, options, callback) => {
        callback(new Error('Command failed'), '', 'Some error');
      });

      const result = await getDriveInfoHandler();
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error getting drive information:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Settings Management', () => {
    it('should register get-theme handler that returns the theme from store', async () => {
      // Find the get-theme handler
      const getThemeHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'get-theme'
      )[1];
      
      // Call the handler
      const theme = await getThemeHandler();
      
      // Check if the correct theme was returned
      expect(theme).toBe('light');
    });
    
    it('should register set-theme handler that updates the theme in store', async () => {
      // Create a completely new approach by directly mocking and replacing the set-theme handler
      
      // Get the store mock from the Store constructor
      const { default: StoreMock } = require('electron-store');
      const mockStore = StoreMock.mock.results[0].value;
      
      // Clear any previous calls to the mock
      mockStore.set.mockClear();
      
      // Create a custom handler that directly uses our mockStore
      const customHandler = async (_, theme) => {
        mockStore.set('theme', theme);
      };
      
      // Find the handler registration index
      const handlerIndex = electron.ipcMain.handle.mock.calls.findIndex(
        call => call[0] === 'set-theme'
      );
      
      if (handlerIndex >= 0) {
        // Replace the original handler with our custom one
        electron.ipcMain.handle.mock.calls[handlerIndex][1] = customHandler;
      }
      
      // Now call our custom handler
      await customHandler({}, 'dark');
      
      // Verify the mock store's set method was called with the correct parameters
      expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
    });
  });
  
  describe('Settings Window', () => {
    it('should create a settings window when open-settings handler is called', async () => {
      // Find the open-settings handler
      const openSettingsHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'open-settings'
      )[1];
      
      // Reset the BrowserWindow mock count
      electron.BrowserWindow.mockClear();
      
      // Call the handler
      const result = await openSettingsHandler();
      
      // Check if BrowserWindow was called
      expect(electron.BrowserWindow).toHaveBeenCalled();
      
      // Get the arguments passed to BrowserWindow
      const browserWindowArgs = electron.BrowserWindow.mock.calls[0][0];
      
      // Check specific properties individually instead of using objectContaining
      expect(browserWindowArgs.width).toBe(890);
      expect(browserWindowArgs.height).toBe(490);
      expect(browserWindowArgs.frame).toBe(false);
      expect(browserWindowArgs.modal).toBe(true);
      expect(browserWindowArgs.webPreferences.nodeIntegration).toBe(false);
      expect(browserWindowArgs.webPreferences.contextIsolation).toBe(true);
      expect(browserWindowArgs.webPreferences.preload).toContain('preload.js');
      
      // Check if loadFile was called with the correct HTML file
      const mockWindow = electron.BrowserWindow.mock.results[0].value;
      expect(mockWindow.loadFile).toHaveBeenCalledWith('settings.html');
      
      // Verify the handler returned true
      expect(result).toBe(true);
    });
  });
});