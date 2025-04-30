// functions.test.js
const { powerDownApp } = require('../functions');

// Mock electron's ipcRenderer
jest.mock('electron', () => ({
  ipcRenderer: {
    send: jest.fn()
  }
}));

describe('Functions Module', () => {
  const { ipcRenderer } = require('electron');
  
  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks();
  });

  describe('powerDownApp', () => {
    it('should send app-quit message through ipcRenderer', () => {
      // Call the function
      powerDownApp();
      
      // Check that ipcRenderer.send was called with the correct argument
      expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
      expect(ipcRenderer.send).toHaveBeenCalledWith('app-quit');
    });
  });
});