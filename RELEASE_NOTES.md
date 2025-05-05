# AppNest Release Notes

## Version 0.3.0 (May 5, 2025)

### Features
- Added new Help menu with access to documentation and release notes
- Implemented dark/light theme toggle for better customization
- Added support for categorizing applications

### Improvements
- Enhanced search functionality with better filtering options
- Improved application icons extraction for better visual display
- Optimized startup performance for faster load times

### Bug Fixes
- Fixed issue with folder paths containing special characters
- Resolved display problems on high-DPI monitors
- Fixed memory leak when refreshing application list repeatedly

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