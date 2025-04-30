// __tests__/main.test.js
// Mock Electron and other dependencies
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
    webContents: {
      openDevTools: jest.fn(),
      toggleDevTools: jest.fn(),
      send: jest.fn()
    },
    isDestroyed: jest.fn().mockReturnValue(false)
  }));
  
  return {
    app: {
      getAppPath: jest.fn().mockReturnValue('/mock/path'),
      quit: jest.fn(),
      on: jest.fn()
    },
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    globalShortcut: {
      register: jest.fn()
    },
    screen: {
      getPrimaryDisplay: jest.fn().mockReturnValue({
        workAreaSize: { width: 1920, height: 1080 }
      })
    },
    dialog: {
      showOpenDialog: jest.fn()
    }
  };
});

jest.mock('child_process', () => ({
  exec: jest.fn((command, options, callback) => {
    // Mock successful execution by default
    if (callback) callback(null, 'mocked stdout', '');
    return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
  })
}));

jest.mock('fs', () => ({
  statfsSync: jest.fn().mockReturnValue({
    blocks: 1000,
    bsize: 1024,
    bfree: 500
  }),
  existsSync: jest.fn().mockReturnValue(true)
}));

jest.mock('../database', () => ({
  initDatabase: jest.fn().mockResolvedValue(),
  getAllApplications: jest.fn().mockResolvedValue([
    { id: '1', name: 'Test App', executable_path: 'C:\\test\\app.exe' }
  ]),
  getApplicationById: jest.fn().mockResolvedValue({
    id: '1', 
    name: 'Test App', 
    executable_path: 'C:\\test\\app.exe'
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
  const mockStore = {
    get: jest.fn().mockImplementation(key => {
      const defaults = {
        theme: 'light',
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
    set: jest.fn()
  };
  return {
    default: jest.fn().mockReturnValue(mockStore)
  };
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

    // Allow the store initialization to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  });
  
  describe('Window Management', () => {
    it('should create a main window with correct parameters on app ready', () => {
      // Manually trigger the app ready event handler
      const readyHandler = electron.app.on.mock.calls.find(call => call[0] === 'ready')[1];
      readyHandler();
      
      // Check if BrowserWindow was called with correct parameters
      expect(electron.BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        width: 650,
        height: 600,
        x: 1920 - 650,
        y: 1080 - 600,
        frame: false,
        resizable: false,
        webPreferences: expect.objectContaining({
          nodeIntegration: false,
          contextIsolation: true,
          preload: expect.stringContaining('/preload.js')
        })
      }));
    });
    
    it('should register DevTools keyboard shortcuts', () => {
      // Trigger the app ready event handler
      const readyHandler = electron.app.on.mock.calls.find(call => call[0] === 'ready')[1];
      readyHandler();
      
      // Check if globalShortcut.register was called for DevTools shortcuts
      expect(electron.globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+I', expect.any(Function));
      expect(electron.globalShortcut.register).toHaveBeenCalledWith('F12', expect.any(Function));
    });
  });
  
  describe('IPC Handlers', () => {
    beforeEach(() => {
      // Trigger the app ready event to register IPC handlers
      const readyHandler = electron.app.on.mock.calls.find(call => call[0] === 'ready')[1];
      readyHandler();
    });
    
    it('should register get-all-apps handler that returns applications from database', async () => {
      // Find the get-all-apps handler
      const getAllAppsHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'get-all-apps'
      )[1];
      
      // Call the handler
      const result = await getAllAppsHandler();
      
      // Check if database was called and handler returned the expected result
      expect(db.getAllApplications).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', name: 'Test App', executable_path: 'C:\\test\\app.exe' }]);
    });
    
    it('should register launch-app handler that launches the app and updates usage', async () => {
      // Find the launch-app handler
      const launchAppHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'launch-app'
      )[1];
      
      // Call the handler
      const result = await launchAppHandler({}, '1');
      
      // Check if the app was launched via child_process.exec
      expect(db.getApplicationById).toHaveBeenCalledWith('1');
      expect(childProcess.exec).toHaveBeenCalledWith(
        '"C:\\test\\app.exe"',
        expect.any(Object),
        expect.any(Function)
      );
      
      // Verify result
      expect(result).toBe(true);
      
      // Check if usage was updated
      // We need to manually call the exec callback to trigger the usage update
      const execCallback = childProcess.exec.mock.calls[0][2];
      execCallback(null);
      expect(db.updateApplicationUsage).toHaveBeenCalledWith('1');
    });
  });
  
  describe('Drive Info Functions', () => {
    it('should get drive info on Windows platform', async () => {
      // Mock the platform and exec command for Windows
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      childProcess.exec.mockImplementationOnce((cmd, callback) => {
        callback(null, 'Caption FreeSpace Size\nC: 100000000 200000000', '');
      });
      
      // Find the get-drive-info handler
      const getDriveInfoHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'get-drive-info'
      )[1];
      
      // Call the handler
      const result = await getDriveInfoHandler();
      
      // Check the results
      expect(result).toEqual([
        expect.objectContaining({
          letter: 'C:',
          total: 200000000,
          free: 100000000,
          used: 100000000,
          percentUsed: 50
        })
      ]);
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
      // Find the set-theme handler
      const setThemeHandler = electron.ipcMain.handle.mock.calls.find(
        call => call[0] === 'set-theme'
      )[1];
      
      // Call the handler
      const result = await setThemeHandler({}, 'dark');
      
      // Check if the store was updated
      const { default: Store } = require('electron-store');
      const mockStoreInstance = Store.mock.results[0].value;
      expect(mockStoreInstance.set).toHaveBeenCalledWith('theme', 'dark');
      expect(result).toBe(true);
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
      
      // Check if a new BrowserWindow was created with the correct parameters
      expect(electron.BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        width: 900,
        height: 600,
        frame: false,
        modal: true,
        show: false,
        webPreferences: expect.objectContaining({
          nodeIntegration: false,
          contextIsolation: true,
          preload: expect.stringContaining('/preload.js')
        })
      }));
      
      // Check if loadFile was called with the correct HTML file
      const mockWindow = electron.BrowserWindow.mock.results[0].value;
      expect(mockWindow.loadFile).toHaveBeenCalledWith('settings.html');
      
      // Verify the handler returned true
      expect(result).toBe(true);
    });
  });
});