# AppNest Release Notes

## Version 0.3.3 (May 12, 2025)

### Improvements
- Windows app icon extraction and system path resolution
- App Config section of setting temporarily removed
- Improved icon extraction reliability

## Version 0.3.2 (May 10, 2025)

### Features
- Drive Panel icons now open the system file manager to the associated system drive when clicked.

## Version 0.3.1 (May 5, 2025)

### Bug Fixes
- Fixed Help and Settings windows positioning issue - windows now properly appear centered on screen
- Resolved issue where modal windows would inherit position from main application window
- Improved window management for multi-monitor setups

### Technical Enhancements
- Refactored window creation code for better position handling
- Enhanced screen coordinates calculation for proper window centering
- Standardized window creation APIs for Help and Settings windows

## Version 0.3.0 (May 5, 2025)

### Features
- Added new Help menu with access to documentation and release notes
- Implemented dark/light theme toggle for better customization
- Added support for categorizing applications
- Added comprehensive Help documentation system with navigation and search
- Implemented Release Notes viewer with version highlighting
- Restructured Settings & Customization help section to mirror Settings file organization (General, Appearance, App Config, Folders)

### Improvements
- Enhanced search functionality with better filtering options
- Improved application icons extraction for better visual display
- Optimized startup performance for faster load times
- Improved user experience with auto-closing menus when clicking elsewhere
- Better theme synchronization across Help window and main application

### Bug Fixes
- Fixed issue with folder paths containing special characters
- Resolved display problems on high-DPI monitors
- Fixed memory leak when refreshing application list repeatedly
- Fixed Help menu positioning issues on smaller screens

### Developer Improvements
- Added comprehensive test suite for Help menu functionality
- Implemented tests for Help documentation window
- Added tests for Release Notes modal
- Improved code structure with better separation of concerns

## Version 0.2.0 (May 5, 2025)

### Features

#### Settings Reset Functionality
- Added a "Reset to Default Settings" button in the settings window
- Implemented confirmation dialog to prevent accidental resets
- All settings now properly reset to carefully chosen default values:
  - Theme: Light
  - App Menu Font Size: 14px
  - Folder Button Visibility: App Folders
  - All folder visibility toggles: ON (for both App Folders and User Folders)
  - App Folders Path: './AppData'
  - Start with Windows: OFF
  - Search Mode: Name Only

#### Improvements
- Added visual feedback after settings reset with a temporary status message
- Improved theme switching with smoother transitions
- Enhanced folder visibility controls with better toggle state preservation

#### Developer Improvements
- Added comprehensive unit tests for settings reset functionality
- Implemented dependency injection in key components for better testability
- Improved error handling for settings operations

### Bug Fixes
- Fixed issue where folder visibility preferences weren't correctly preserved
- Addressed theme inconsistencies between settings and main windows
- Resolved startup issues with application auto-launch configuration

### Technical Enhancements
- Refactored settings management for better maintainability
- Improved synchronization between main process and renderer processes
- Enhanced error handling for all settings operations

### Known Issues
- Custom folder path selection dialog may not appear on some Windows configurations

## Version 0.1.0 (March 15, 2025)

### Features
- Initial release with basic application management
- Support for portable and installed applications
- Drive space visualization
- Folder navigation for application content
- Basic search functionality

### Notes
- This is the first public release of AppNest
- Compatible with Windows 10 and 11