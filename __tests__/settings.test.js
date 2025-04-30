// Mock the electron-store module
const mockSet = jest.fn();
const mockGet = jest.fn((key) => {
  if (key === 'theme') return 'dark';
  if (key === 'folderPreferences') {
    return {
      folderType: 'app',
      appFolders: {
        documents: true
      }
    };
  }
  return undefined;
});

jest.mock('electron-store', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet
    }))
  };
});

// After the mocks, import the settings module
const settings = require('../settings');

describe('Settings Module', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    mockSet.mockClear();
    mockGet.mockClear();
  });

  describe('getTheme', () => {
    it('should return the current theme', async () => {
      const theme = await settings.getTheme();
      expect(theme).toBe('dark');
      expect(mockGet).toHaveBeenCalledWith('theme');
    });
  });

  describe('setTheme', () => {
    it('should set the theme in the store', async () => {
      await settings.setTheme('light');
      expect(mockSet).toHaveBeenCalledWith('theme', 'light');
    });
  });

  describe('getFolderPreferences', () => {
    it('should return folder preferences', async () => {
      const prefs = await settings.getFolderPreferences();
      expect(prefs).toEqual({
        folderType: 'app',
        appFolders: {
          documents: true
        }
      });
      expect(mockGet).toHaveBeenCalledWith('folderPreferences');
    });
  });

  describe('setFolderPreferences', () => {
    it('should update folder preferences', async () => {
      const newPrefs = {
        folderType: 'windows',
        windowsFolders: {
          downloads: true
        }
      };
      
      await settings.setFolderPreferences(newPrefs);
      expect(mockSet).toHaveBeenCalledWith('folderPreferences', newPrefs);
    });
  });
});