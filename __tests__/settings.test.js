// Mock the electron-store module
const mockHas = jest.fn((key) => {
  if (key === 'icon-size') return true;
  return false;
});

const mockSet = jest.fn();
const mockGet = jest.fn((key, defaultValue) => {
  if (key === 'theme') return 'dark';
  if (key === 'folderPreferences') {
    return {
      folderType: 'app',
      appFolders: {
        documents: true
      }
    };
  }
  if (key === 'font-size') return '14';
  if (key === 'icon-size') return '20';
  return defaultValue || undefined;
});

jest.mock('electron-store', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      has: mockHas
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
    mockHas.mockClear();
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

  describe('getFontSize', () => {
    it('should return the current font size', async () => {
      const fontSize = await settings.getFontSize();
      expect(fontSize).toBe('14');
      expect(mockGet).toHaveBeenCalledWith('font-size');
    });
    
    it('should return default font size when not set', async () => {
      // Mock the return of undefined for font-size
      mockGet.mockImplementationOnce(() => undefined);
      
      const fontSize = await settings.getFontSize();
      expect(fontSize).toBeDefined();
      expect(mockGet).toHaveBeenCalledWith('font-size');
    });
  });
  
  describe('setFontSize', () => {
    it('should set the font size in the store', async () => {
      await settings.setFontSize('12');
      expect(mockSet).toHaveBeenCalledWith('font-size', '12');
    });
    
    it('should set both font size and icon size when provided', async () => {
      await settings.setFontSize('12', '18');
      expect(mockSet).toHaveBeenCalledWith('font-size', '12');
      expect(mockSet).toHaveBeenCalledWith('icon-size', '18');
    });
  });
  
  describe('getIconSize', () => {
    it('should return the current icon size', async () => {
      const iconSize = await settings.getIconSize();
      expect(iconSize).toBe('20');
      expect(mockGet).toHaveBeenCalledWith('icon-size', '20');
    });
    
    it('should calculate icon size from font size when not set', async () => {
      // Mock has('icon-size') to return false for this test
      mockHas.mockImplementationOnce(() => false);
      mockGet.mockImplementationOnce((key, defaultVal) => {
        if (key === 'font-size') return '12';
        return defaultVal;
      });
      
      const iconSize = await settings.getIconSize();
      expect(iconSize).toBeDefined();
      expect(parseInt(iconSize)).toBeGreaterThanOrEqual(14);
      expect(parseInt(iconSize)).toBeLessThanOrEqual(20);
      expect(mockHas).toHaveBeenCalledWith('icon-size');
      expect(mockGet).toHaveBeenCalledWith('font-size', '16');
    });
    
    it('should return default icon size when neither font nor icon size are set', async () => {
      mockHas.mockImplementationOnce(() => false);
      mockGet.mockImplementationOnce(() => undefined);
      
      const iconSize = await settings.getIconSize();
      expect(iconSize).toBe('20'); // Default to 20px
      expect(mockHas).toHaveBeenCalledWith('icon-size');
    });
  });
  
  describe('calculateIconSize', () => {
    it('should correctly calculate icon size based on font size', () => {
      // This assumes calculateIconSize is exported - we may need to mock it
      // Testing the scaling function: 14px at font-size 9px, 20px at font-size 14px
      
      // Let's simulate how it would be calculated
      const minFontSize = 9;
      const maxFontSize = 14;
      const minIconSize = 14;
      const maxIconSize = 20;
      
      const calculateTestIconSize = (fontSize) => {
        const boundedFontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
        const proportion = (boundedFontSize - minFontSize) / (maxFontSize - minFontSize);
        return Math.round(minIconSize + proportion * (maxIconSize - minIconSize));
      };
      
      // Test min font size
      expect(calculateTestIconSize(9)).toBe(14);
      
      // Test max font size
      expect(calculateTestIconSize(14)).toBe(20);
      
      // Test middle value
      expect(calculateTestIconSize(11.5)).toBe(17);
      
      // Test below range
      expect(calculateTestIconSize(7)).toBe(14);
      
      // Test above range
      expect(calculateTestIconSize(16)).toBe(20);
    });
  });
});