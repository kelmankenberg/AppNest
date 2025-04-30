# AppNest – All Your Apps, One Nest

A lightweight Electron-based application for Windows that helps users launch installed and portable applications from their file system. AppNest is designed to work in harmony with the Windows Start menu or as a standalone launcher. Its goal is to provide a seamless, efficient way to launch both installed and portable applications, enhancing workflow and organization for all types of users.

## Features

- **Application Management**: Add, edit, and remove applications with a simple user interface.
- **Quick Launch**: Easily launch both installed and portable applications.
- **Categorization**: Group applications by categories for better organization.
- **Search**: Quickly find applications using the search feature.
- **Favorites**: Mark frequently used applications as favorites.
- **Usage Tracking**: Automatically tracks recently used and most frequently used applications.
- **Dark/Light Theme**: Toggle between dark and light themes.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v14.x or later recommended)
- npm (included with Node.js)

### Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/windows-desktop-launcher.git
   cd windows-desktop-launcher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

## Development

### Project Structure
- `main.js` - Electron main process
- `preload.js` - Preload script for secure Electron <-> Renderer communication
- `index.html` - Main UI
- `style.css` - UI styling
- `database.js` - SQLite database operations
- `functions.js` - Utility functions

### Database
The application uses SQLite for data storage with the following tables:
- Applications - Core app information
- Categories - Predefined and custom categories
- Tags - Application tags for filtering
- AppTags - Junction table for many-to-many relationships
- LaunchHistory - Usage tracking

## Building
To create a distributable package:
```bash
npm run make
```

## License
[MIT](LICENSE)

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.