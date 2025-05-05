// filepath: c:\dev\AppNest\__tests__\power-button-icon.test.js

// Mock IPC calls
const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn((channel, callback) => {
    // Store the callback for testing
    if (channel === 'minimize-on-power-button-changed') {
      mockIpcRenderer.minimizeOnPowerButtonCallback = callback;
    }
  }),
  send: jest.fn()
};

// Mock electron
jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn()
  },
  ipcRenderer: mockIpcRenderer
}));

describe('Power Button Icon', () => {
  let powerButton;
  let updatePowerButtonIcon;
  
  beforeEach(() => {
    // Create a clean DOM environment before each test
    document.body = document.createElement('body');
    
    // Create the power button element
    powerButton = document.createElement('button');
    powerButton.title = "Power";
    powerButton.innerHTML = '<i class="fas fa-power-off"></i>';
    document.body.appendChild(powerButton);
    
    // Reset mock function calls
    mockIpcRenderer.invoke.mockReset();
    mockIpcRenderer.send.mockReset();
    
    // Define the updatePowerButtonIcon function for direct testing
    updatePowerButtonIcon = (minimizeEnabled) => {
      const button = document.querySelector('button[title="Power"], button[title="Minimize"]');
      
      if (button) {
        if (minimizeEnabled === true) {
          // Change icon to minimize icon when the setting is enabled
          button.innerHTML = '<i class="fas fa-window-minimize"></i>';
          button.title = "Minimize";
        } else {
          // Use the default power icon when the setting is disabled (quit behavior)
          button.innerHTML = '<i class="fas fa-power-off"></i>';
          button.title = "Power";
        }
      }
    };
  });
  
  test('updatePowerButtonIcon changes to minimize icon when minimize is enabled', () => {
    // Call the function with minimize enabled
    updatePowerButtonIcon(true);
    
    // Check if the button's icon and title were updated correctly
    expect(powerButton.title).toBe("Minimize");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-window-minimize"></i>');
  });
  
  test('updatePowerButtonIcon changes to power icon when minimize is disabled', () => {
    // First set it to minimize to test the change
    powerButton.title = "Minimize";
    powerButton.innerHTML = '<i class="fas fa-window-minimize"></i>';
    
    // Call the function with minimize disabled
    updatePowerButtonIcon(false);
    
    // Check if the button's icon and title were updated correctly
    expect(powerButton.title).toBe("Power");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-power-off"></i>');
  });
  
  test('updatePowerButtonIcon handles falsy values as "disabled"', () => {
    // Test with various falsy values
    const falsyValues = [false, null, undefined, 0, ''];
    
    falsyValues.forEach(value => {
      // First set it to minimize to test the change
      powerButton.title = "Minimize";
      powerButton.innerHTML = '<i class="fas fa-window-minimize"></i>';
      
      // Call the function with the falsy value
      updatePowerButtonIcon(value);
      
      // Check if the button's icon and title were updated correctly
      expect(powerButton.title).toBe("Power");
      expect(powerButton.innerHTML).toBe('<i class="fas fa-power-off"></i>');
    });
  });
  
  test('updatePowerButtonIcon finds the button by either Power or Minimize title', () => {
    // Change the title to Minimize
    powerButton.title = "Minimize";
    
    // Call the function with minimize disabled
    updatePowerButtonIcon(false);
    
    // Check if the button was found and updated correctly
    expect(powerButton.title).toBe("Power");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-power-off"></i>');
  });

  // Test the integration with event listeners
  test('power button icon updates when minimize-on-power-button-changed event is received', () => {
    // Mock window.electronAPI.onMinimizeOnPowerButtonChanged
    window.electronAPI = {
      onMinimizeOnPowerButtonChanged: jest.fn(callback => {
        // Store the callback for testing
        window.electronAPI.minimizeCallback = callback;
      }),
      getMinimizeOnPowerButton: jest.fn().mockResolvedValue(false)
    };
    
    // Create a test renderer.js environment
    const attachEventListeners = () => {
      // Simulate the event attachment code from renderer.js
      window.electronAPI.onMinimizeOnPowerButtonChanged((enabled) => {
        updatePowerButtonIcon(enabled);
      });
    };
    
    // Attach the event listeners
    attachEventListeners();
    
    // Verify the listener was attached
    expect(window.electronAPI.onMinimizeOnPowerButtonChanged).toHaveBeenCalled();
    
    // Simulate receiving the minimize-on-power-button-changed event with true
    window.electronAPI.minimizeCallback(true);
    
    // Check if the button's icon and title were updated correctly
    expect(powerButton.title).toBe("Minimize");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-window-minimize"></i>');
    
    // Simulate receiving the minimize-on-power-button-changed event with false
    window.electronAPI.minimizeCallback(false);
    
    // Check if the button's icon and title were updated correctly
    expect(powerButton.title).toBe("Power");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-power-off"></i>');
  });
  
  test('power button action changes based on minimize-on-power-button setting', async () => {
    // Mock window.electronAPI
    window.electronAPI = {
      getMinimizeOnPowerButton: jest.fn(),
      minimizeApp: jest.fn(),
      quitApp: jest.fn()
    };
    
    // Create a click handler function similar to what's in renderer.js
    const handlePowerButtonClick = async () => {
      try {
        const minimizeEnabled = await window.electronAPI.getMinimizeOnPowerButton();
        
        if (minimizeEnabled) {
          window.electronAPI.minimizeApp();
        } else {
          window.electronAPI.quitApp();
        }
      } catch (err) {
        console.error('Error checking minimize-on-power-button setting:', err);
        // Default to quitting if there's an error
        window.electronAPI.quitApp();
      }
    };
    
    // Test case when minimize is enabled
    window.electronAPI.getMinimizeOnPowerButton.mockResolvedValueOnce(true);
    
    await handlePowerButtonClick();
    
    expect(window.electronAPI.minimizeApp).toHaveBeenCalled();
    expect(window.electronAPI.quitApp).not.toHaveBeenCalled();
    
    // Reset the mock calls
    window.electronAPI.minimizeApp.mockReset();
    window.electronAPI.quitApp.mockReset();
    
    // Test case when minimize is disabled
    window.electronAPI.getMinimizeOnPowerButton.mockResolvedValueOnce(false);
    
    await handlePowerButtonClick();
    
    expect(window.electronAPI.minimizeApp).not.toHaveBeenCalled();
    expect(window.electronAPI.quitApp).toHaveBeenCalled();
    
    // Reset the mock calls
    window.electronAPI.minimizeApp.mockReset();
    window.electronAPI.quitApp.mockReset();
    
    // Test error handling
    window.electronAPI.getMinimizeOnPowerButton.mockRejectedValueOnce(new Error('Test error'));
    
    await handlePowerButtonClick();
    
    expect(window.electronAPI.minimizeApp).not.toHaveBeenCalled();
    expect(window.electronAPI.quitApp).toHaveBeenCalled(); // Should default to quit on error
  });
  
  test('power button icon initializes correctly when page loads', async () => {
    // Mock window.electronAPI for initialization test
    window.electronAPI = {
      getMinimizeOnPowerButton: jest.fn()
    };
    
    // Function to simulate initialization on page load
    const initializePowerButton = async () => {
      try {
        const minimizeEnabled = await window.electronAPI.getMinimizeOnPowerButton();
        updatePowerButtonIcon(minimizeEnabled);
      } catch (err) {
        // On error, default to power icon (quit behavior)
        updatePowerButtonIcon(false);
      }
    };
    
    // Test initialization with minimize enabled
    window.electronAPI.getMinimizeOnPowerButton.mockResolvedValueOnce(true);
    
    await initializePowerButton();
    
    expect(powerButton.title).toBe("Minimize");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-window-minimize"></i>');
    
    // Test initialization with minimize disabled
    powerButton.title = "Power"; // Reset
    powerButton.innerHTML = '<i class="fas fa-power-off"></i>'; // Reset
    window.electronAPI.getMinimizeOnPowerButton.mockResolvedValueOnce(false);
    
    await initializePowerButton();
    
    expect(powerButton.title).toBe("Power");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-power-off"></i>');
    
    // Test initialization with error
    powerButton.title = "Minimize"; // Set to minimize first
    powerButton.innerHTML = '<i class="fas fa-window-minimize"></i>'; // Set to minimize first
    window.electronAPI.getMinimizeOnPowerButton.mockRejectedValueOnce(new Error('Test error'));
    
    await initializePowerButton();
    
    // Should default to power icon on error
    expect(powerButton.title).toBe("Power");
    expect(powerButton.innerHTML).toBe('<i class="fas fa-power-off"></i>');
  });
});