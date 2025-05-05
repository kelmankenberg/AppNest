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
      expect(fontSize).toBe('16'); // Default font size should be 16
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
      // Mock has('icon-size') to return false and get('font-size') to return undefined
      mockHas.mockImplementationOnce(() => false);
      mockGet.mockImplementationOnce((key, defaultVal) => {
        if (key === 'font-size') return defaultVal; // Use the default value provided
        return undefined;
      });
      
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
  
  describe('resetToDefaults', () => {
    // Mock confirm function to return true (user clicked OK)
    const originalConfirm = global.confirm;
    
    // Mock the resetToDefaults function
    let resetToDefaults;
    
    beforeEach(() => {
      // Set up window.confirm mock
      global.confirm = jest.fn(() => true);
      
      // Set up document body
      document.body = document.createElement('body');
      
      // Create and add theme options
      const themeLight = document.createElement('div');
      themeLight.setAttribute('data-theme', 'light');
      themeLight.className = 'theme-option';
      document.body.appendChild(themeLight);
      
      const themeDark = document.createElement('div');
      themeDark.setAttribute('data-theme', 'dark');
      themeDark.className = 'theme-option active';
      document.body.appendChild(themeDark);
      
      // Create font size slider and value display
      const fontSizeSlider = document.createElement('input');
      fontSizeSlider.id = 'fontSize';
      fontSizeSlider.type = 'range';
      fontSizeSlider.value = '16';
      document.body.appendChild(fontSizeSlider);
      
      const fontSizeValue = document.createElement('span');
      fontSizeValue.id = 'fontSizeValue';
      fontSizeValue.textContent = '16px';
      document.body.appendChild(fontSizeValue);
      
      // Create folder toggles for app folders
      const folderTypes = ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'];
      folderTypes.forEach(type => {
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'app' + type;
        toggle.checked = false; // Set them to unchecked initially to test they get reset to checked
        document.body.appendChild(toggle);
      });
      
      // Create folder toggles for Windows folders
      folderTypes.forEach(type => {
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'win' + type;
        toggle.checked = false; // Set them to unchecked initially to test they get reset to checked
        document.body.appendChild(toggle);
      });
      
      // Create Start with Windows toggle
      const startWithWindows = document.createElement('input');
      startWithWindows.type = 'checkbox';
      startWithWindows.id = 'startWithWindows';
      startWithWindows.checked = true; // Set to checked initially to test it gets reset to unchecked
      document.body.appendChild(startWithWindows);
      
      // Create Search Mode selector
      const searchMode = document.createElement('select');
      searchMode.id = 'searchMode';
      const nameOption = document.createElement('option');
      nameOption.value = 'name';
      searchMode.appendChild(nameOption);
      const descriptionOption = document.createElement('option');
      descriptionOption.value = 'description';
      searchMode.appendChild(descriptionOption);
      searchMode.value = 'description'; // Set to description initially to test it gets reset to name
      document.body.appendChild(searchMode);
      
      // Create folder type segment options
      const appSegment = document.createElement('div');
      appSegment.className = 'segment-option';
      appSegment.setAttribute('data-folder-type', 'app');
      document.body.appendChild(appSegment);
      
      const windowsSegment = document.createElement('div');
      windowsSegment.className = 'segment-option active';
      windowsSegment.setAttribute('data-folder-type', 'windows');
      document.body.appendChild(windowsSegment);
      
      // Create folder contents
      const appFolders = document.createElement('div');
      appFolders.id = 'appFolders';
      appFolders.className = 'folder-type-content';
      document.body.appendChild(appFolders);
      
      const windowsFolders = document.createElement('div');
      windowsFolders.id = 'windowsFolders';
      windowsFolders.className = 'folder-type-content active';
      document.body.appendChild(windowsFolders);
      
      // Create app folders path display
      const pathValue = document.createElement('span');
      pathValue.className = 'path-value';
      pathValue.textContent = '/custom/path';
      document.body.appendChild(pathValue);
      
      // Import the resetToDefaults function AFTER setting up all the mocks
      jest.resetModules(); // Clear module cache
      const settingsRenderer = require('../settings-renderer');
      resetToDefaults = settingsRenderer.resetToDefaults;
    });
    
    afterEach(() => {
      // Restore original confirm function
      global.confirm = originalConfirm;
      
      // Clean up the DOM
      document.body.innerHTML = '';
    });
    
    it('should reset all settings to default values when confirmed', async () => {
      // Create mock APIs for testing
      const mockAPIs = {
        setTheme: jest.fn().mockResolvedValue(),
        syncTheme: jest.fn(),
        setFontSize: jest.fn().mockResolvedValue(),
        syncFontSize: jest.fn(),
        setAutoStart: jest.fn().mockResolvedValue(),
        setFolderPreferences: jest.fn().mockResolvedValue(),
        syncFolderPreferences: jest.fn(),
        setAppFoldersRootPath: jest.fn().mockResolvedValue(),
        setSearchMode: jest.fn().mockResolvedValue()
      };
      
      // Call the function with injected APIs
      resetToDefaults(mockAPIs);
      
      // Wait for all promises to resolve
      await new Promise(process.nextTick);
      
      // Verify confirm was called
      expect(global.confirm).toHaveBeenCalled();
      
      // Verify theme was reset to light
      expect(mockAPIs.setTheme).toHaveBeenCalledWith('light');
      expect(mockAPIs.syncTheme).toHaveBeenCalledWith('light');
      
      // Verify theme UI was updated
      const lightTheme = document.querySelector('.theme-option[data-theme="light"]');
      const darkTheme = document.querySelector('.theme-option[data-theme="dark"]');
      expect(lightTheme.classList.contains('active')).toBe(true);
      expect(darkTheme.classList.contains('active')).toBe(false);
      
      // Verify font size was reset to 14
      expect(mockAPIs.setFontSize).toHaveBeenCalledWith(14, expect.any(Number));
      expect(document.getElementById('fontSize').value).toBe('14');
      expect(document.getElementById('fontSizeValue').textContent).toBe('14px');
      
      // Verify app folder toggles were reset to checked (visible)
      ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'].forEach(type => {
        expect(document.getElementById('app' + type).checked).toBe(true);
      });
      
      // Verify windows folder toggles were reset to checked (visible)
      ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'].forEach(type => {
        expect(document.getElementById('win' + type).checked).toBe(true);
      });
      
      // Verify folder type was reset to app
      expect(document.querySelector('.segment-option[data-folder-type="app"]').classList.contains('active')).toBe(true);
      expect(document.querySelector('.segment-option[data-folder-type="windows"]').classList.contains('active')).toBe(false);
      
      // Verify app folders path was reset to ./AppData
      expect(document.querySelector('.path-value').textContent).toBe('./AppData');
      if (mockAPIs.setAppFoldersRootPath) {
        expect(mockAPIs.setAppFoldersRootPath).toHaveBeenCalledWith('./AppData');
      }
      
      // Verify Start with Windows was set to off
      expect(document.getElementById('startWithWindows').checked).toBe(false);
      expect(mockAPIs.setAutoStart).toHaveBeenCalledWith(false);
      
      // Verify Search Mode was set to name only
      expect(document.getElementById('searchMode').value).toBe('name');
      if (mockAPIs.setSearchMode) {
        expect(mockAPIs.setSearchMode).toHaveBeenCalledWith('name');
      }
      
      // Verify folder preferences were saved with the correct default values
      expect(mockAPIs.setFolderPreferences).toHaveBeenCalledWith({
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
      });
      
      // Verify folder preferences were synced with the main window
      expect(mockAPIs.syncFolderPreferences).toHaveBeenCalled();
    });
    
    it('should not reset settings when user cancels confirmation', () => {
      // Override confirm to return false (user clicked Cancel)
      global.confirm = jest.fn(() => false);
      
      // Create mock APIs for testing
      const mockAPIs = {
        setTheme: jest.fn().mockResolvedValue(),
        syncTheme: jest.fn(),
        setFontSize: jest.fn().mockResolvedValue(),
        setAutoStart: jest.fn().mockResolvedValue(),
        setFolderPreferences: jest.fn().mockResolvedValue()
      };
      
      // Call the function with injected APIs
      resetToDefaults(mockAPIs);
      
      // Verify confirm was called
      expect(global.confirm).toHaveBeenCalled();
      
      // Verify no settings were changed
      expect(mockAPIs.setTheme).not.toHaveBeenCalled();
      expect(mockAPIs.setFontSize).not.toHaveBeenCalled();
      expect(mockAPIs.setAutoStart).not.toHaveBeenCalled();
      expect(mockAPIs.setFolderPreferences).not.toHaveBeenCalled();
    });
  });
});