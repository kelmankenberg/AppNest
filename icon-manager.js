/**
 * Icon Manager for AppNest
 * Extracts icons from executable files and saves them as PNGs
 */

const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

// Directory for storing icon files
const ICON_DIR = path.join(app.getPath('userData'), 'app-icons');

/**
 * Ensures the icon directory exists
 */
async function ensureIconDir() {
  try {
    await fs.mkdir(ICON_DIR, { recursive: true });
    console.log('Icon directory ensured:', ICON_DIR);
  } catch (error) {
    console.error('Error creating icon directory:', error);
    throw error;
  }
}

/**
 * Generates a unique filename for an icon based on the executable path
 * @param {string} executablePath - Path to the executable
 * @returns {string} - MD5 hash of the path with .png extension
 */
function getIconFileName(executablePath) {
  const hash = crypto.createHash('md5').update(executablePath).digest('hex');
  return `${hash}.png`;
}

/**
 * Extracts an icon from an executable file
 * @param {string} executablePath - Path to the executable
 * @returns {Promise<string|null>} - Path to the extracted icon or null if extraction failed
 */
async function extractIcon(executablePath) {
  try {
    // Ensure icon directory exists
    await ensureIconDir();

    // Generate unique filename for the icon
    const iconFileName = getIconFileName(executablePath);
    const iconPath = path.join(ICON_DIR, iconFileName);

    // Check if icon already exists
    try {
      await fs.access(iconPath);
      console.log(`Icon already exists for: ${executablePath}`);
      return iconPath;
    } catch (err) {
      // Icon does not exist yet, continue with extraction
      console.log(`Extracting icon for: ${executablePath}`);
    }

    // On Windows, use PowerShell to extract icon
    if (process.platform === 'win32') {
      // PowerShell script to extract icon from executable
      const psScript = `
        Add-Type -AssemblyName System.Drawing
        try {
          $icon = [System.Drawing.Icon]::ExtractAssociatedIcon("${executablePath.replace(/\\/g, '\\\\')}")
          if ($icon -ne $null) {
            $bitmap = $icon.ToBitmap()
            $bitmap.Save("${iconPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png)
            $bitmap.Dispose()
            $icon.Dispose()
            Write-Output "Success: Icon extracted to ${iconPath.replace(/\\/g, '\\\\')}"
          } else {
            Write-Error "Failed to extract icon: No icon found in the file"
          }
        } catch {
          Write-Error "Error extracting icon: $_"
        }
      `;

      const { stdout, stderr } = await execFileAsync('powershell', ['-Command', psScript]);

      if (stderr) {
        console.error('PowerShell error:', stderr);
        return null;
      }

      // Verify the file was created
      try {
        await fs.access(iconPath);
        console.log(`Icon successfully extracted to: ${iconPath}`);
        return iconPath;
      } catch (err) {
        console.error(`Icon file not found after extraction: ${iconPath}`);
        return null;
      }
    } else {
      // For non-Windows platforms, we could implement other extraction methods
      console.log('Icon extraction not supported on this platform yet');
      return null;
    }
  } catch (error) {
    console.error('Error extracting icon:', error);
    return null;
  }
}

/**
 * Gets icon for an application, extracting it if needed
 * @param {string} executablePath - Path to the executable
 * @returns {Promise<string|null>} - Path to the icon or null if extraction failed
 */
async function getIconForApp(executablePath) {
  if (!executablePath) {
    return null;
  }

  return await extractIcon(executablePath);
}

module.exports = {
  extractIcon,
  getIconForApp,
  getIconFileName,
  ICON_DIR
};