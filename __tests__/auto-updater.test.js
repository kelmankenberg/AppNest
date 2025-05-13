// Mock electron-log
const mockLog = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  transports: {
    file: { level: 'info' }
  }
};

// Mock electron-updater
const mockAutoUpdater = {
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn(),
  quitAndInstall: jest.fn(),
  on: jest.fn(),
  currentVersion: '0.3.5',
  feedURL: '',
  setFeedURL: jest.fn(),
  autoDownload: true,
  allowPrerelease: false,
  fullChangelog: '',
  allowDowngrade: false,
  autoInstallOnAppQuit: true,
  allowUnstableUpdateForPrerelease: false,
  currentVersionFull: '0.3.5',
  logger: null,
  addAuthHeader: jest.fn(),
  getFeedURL: jest.fn().mockReturnValue('https://github.com/kelmankenberg/AppNest/releases/latest'),
  getUpdateInfo: jest.fn().mockResolvedValue({
    version: '0.3.6',
    files: [],
    path: 'AppNest-Setup-0.3.6.exe',
    sha512: 'test-sha512',
    releaseDate: new Date().toISOString()
  })
};

// Mock the modules
jest.mock('electron-log', () => mockLog);
jest.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater
}));

// Import the module to test
const { checkForUpdates, downloadUpdate, installUpdate } = require('../auto-updater');

describe('AutoUpdater', () => {
  describe('checkForUpdates', () => {
    it('should check for updates and return update info', async () => {
      // Mock the checkForUpdates response
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '0.3.6',
          files: [],
          path: 'AppNest-Setup-0.3.6.exe',
          sha512: 'test-sha512',
          releaseDate: new Date().toISOString()
        },
        downloadPromise: Promise.resolve()
      });

      const mockMainWindow = { webContents: { send: jest.fn() } };
      const result = await checkForUpdates(mockMainWindow);
      
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
      expect(result).toHaveProperty('version', '0.3.6');
      expect(mockLog.info).toHaveBeenCalledWith('Checking for updates...');
    });

    it('should handle errors when checking for updates', async () => {
      const mockMainWindow = { webContents: { send: jest.fn() } };
      const error = new Error('Network error');
      mockAutoUpdater.checkForUpdates.mockRejectedValue(error);

      await expect(checkForUpdates(mockMainWindow)).rejects.toThrow('Network error');
      expect(mockLog.error).toHaveBeenCalledWith('Error checking for updates:', error);
    });
  });

  describe('downloadUpdate', () => {
    it('should download the update', async () => {
      mockAutoUpdater.downloadUpdate.mockResolvedValue();
      
      const mockMainWindow = { webContents: { send: jest.fn() } };
      await downloadUpdate(mockMainWindow);
      
      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith('Downloading update...');
    });
  });

  describe('installUpdate', () => {
    it('should install the update', async () => {
      await installUpdate();
      
      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith('Installing update...');
    });
  });
});
