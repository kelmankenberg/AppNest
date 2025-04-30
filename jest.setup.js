// Mock Electron since we can't run it in Jest directly
const mockElectron = {
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  },
  webFrame: {
    setZoomFactor: jest.fn()
  },
  app: {
    getPath: jest.fn()
  }
};

// Set up global variables that are available in a browser environment
global.document = window.document;
global.window = window;

// Note: We're not mocking electron, electron-store, or sqlite3 here
// because we want to allow individual tests to define their own mocks
// Test files will provide their own more specific mocks as needed