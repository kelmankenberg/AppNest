# AppNest Help System Structure

## Overview
The AppNest help system follows a modern three-panel layout similar to popular IDEs like Visual Studio Code. This document outlines the structure and components of the help interface.

## Layout Diagram
```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo] AppNest Help                    [🔍 Search...]     [✕]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │                  │  │                                      │  │
│  │  Getting Started │  │  Welcome to AppNest                  │  │
│  │  [▶]            │  │                                      │  │
│  │    • Welcome    │  │  AppNest is an application launcher  │  │
│  │    • System     │  │  designed to work in harmony with    │  │
│  │      Requirements│  │  the Windows Start menu...           │  │
│  │    • Installation│  │                                      │  │
│  │                  │  │  Key Features:                       │  │
│  │  Adding Apps     │  │  • Unified Launcher                  │  │
│  │  [▶]            │  │  • Organization Tools                │  │
│  │    • Add New     │  │  • Quick Search                      │  │
│  │    • Portable    │  │  • Folder Access                     │  │
│  │    • Installed   │  │  • Drive Space Monitoring            │  │
│  │    • Categories  │  │  • Dark & Light Themes               │  │
│  │                  │  │                                      │  │
│  │  Managing Apps   │  │                                      │  │
│  │  [▶]            │  │                                      │  │
│  │    • Launch      │  │                                      │  │
│  │    • Edit        │  │                                      │  │
│  │    • Remove      │  │                                      │  │
│  │    • Favorites   │  │                                      │  │
│  │    • Sorting     │  │                                      │  │
│  │                  │  │                                      │  │
│  │  Settings        │  │                                      │  │
│  │  [▶]            │  │                                      │  │
│  │    • General     │  │                                      │  │
│  │    • Appearance  │  │                                      │  │
│  │    • App Config  │  │                                      │  │
│  │    • Folders     │  │                                      │  │
│  │    • Reset       │  │                                      │  │
│  │                  │  │                                      │  │
│  │  Troubleshooting │  │                                      │  │
│  │  [▶]            │  │                                      │  │
│  │    • Common      │  │                                      │  │
│  │    • Missing     │  │                                      │  │
│  │    • Launch      │  │                                      │  │
│  │                  │  │                                      │  │
│  │  About           │  │                                      │  │
│  │  [▶]            │  │                                      │  │
│  │    • Version     │  │                                      │  │
│  │    • Credits     │  │                                      │  │
│  │    • License     │  │                                      │  │
│  │                  │  │                                      │  │
│  └──────────────────┘  └──────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Header Bar
- **App Logo**: AppNest logo in the top-left corner
- **Window Title**: "AppNest Help"
- **Search Box**: Global search functionality with icon
- **Close Button**: Window control button

### 2. Navigation Sidebar
- **Width**: 280px
- **Features**:
  - Collapsible sections with expand/collapse icons
  - Hierarchical menu structure
  - Section icons for visual identification
  - Active state indicators
  - Scrollable content

### 3. Content Area
- **Features**:
  - Topic title
  - Introduction text
  - Feature lists
  - Code examples
  - Images/screenshots
  - Related links
  - Scrollable content

## Technical Specifications

### Window Dimensions
- **Default Size**: 1024x700px
- **Minimum Size**: 800x600px
- **Header Height**: 60px
- **Content Padding**: 20px

### Typography
- **Primary Font**: System UI
  - Windows: Segoe UI
  - macOS: -apple-system
  - Linux: system-ui

### Theme Support
- Light theme
- Dark theme
- System theme detection

### Navigation Structure
1. Getting Started
   - Welcome
   - System Requirements
   - Installation

2. Adding Applications
   - Add New
   - Portable Apps
   - Installed Apps
   - Categories

3. Managing Applications
   - Launch
   - Edit
   - Remove
   - Favorites
   - Sorting

4. Settings & Customization
   - General
   - Appearance
   - App Configuration
   - Folders
   - Reset

5. Troubleshooting
   - Common Issues
   - Missing Icons
   - Launch Failures

6. About
   - Version Information
   - Credits
   - License

## Implementation Notes
- The help window is implemented as a frameless Electron window
- Content is loaded dynamically based on user navigation
- Search functionality works across all help topics
- The interface is responsive and adapts to window resizing
- All text content is stored in separate HTML files for easy maintenance 