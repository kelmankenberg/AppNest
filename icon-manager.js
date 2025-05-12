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

// Guard against execFile being undefined in test environments
const execFileAsync = execFile ? util.promisify(execFile) : null;

// Directory for storing icon files
// Handle the case where app.getPath is not available in test environment
let ICON_DIR;
try {
  ICON_DIR = app && typeof app.getPath === 'function' 
    ? path.join(app.getPath('userData'), 'app-icons') 
    : path.join(process.cwd(), 'test-app-icons');
} catch (error) {
  console.warn('Could not get user data path, using fallback for tests', error);
  ICON_DIR = path.join(process.cwd(), 'test-app-icons');
}

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
      const psScript = `
        $ErrorActionPreference = "Stop"
        Add-Type -AssemblyName System.Drawing
        Add-Type -AssemblyName System.Windows.Forms

        function Save-Icon {
          param($Icon, $Path)
          try {
            $bitmap = $Icon.ToBitmap()
            $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
            $bitmap.Dispose()
            $Icon.Dispose()
            return $true
          } catch {
            Write-Error "Failed to save icon: $_"
            return $false
          }
        }

        try {
          $ExecutablePath = '${executablePath.replace(/'/g, "''")}' 
          Write-Host "Extracting icon from: $ExecutablePath"

          # Check if this is a UWP app by looking for AppxManifest.xml first
          $appDir = Split-Path -Parent $ExecutablePath
          $manifestPath = Get-ChildItem -Path $appDir -Filter "AppxManifest.xml" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
          
          if ($manifestPath) {
            Write-Host "UWP app detected, using AppxManifest method first..."
            try {
              [xml]$manifest = Get-Content $manifestPath.FullName
              # Look for Square44x44Logo or relevant logo paths
              $logoPath = $null
              $visualElements = $manifest.Package.Applications.Application.VisualElements
              
              # Try different logo attributes in priority order
              $logoAttributes = @(
                'Square44x44Logo',
                'Logo',
                'Square150x150Logo',
                'SmallLogo'
              )
              
              foreach ($attr in $logoAttributes) {
                if ($visualElements.$attr) {
                  $logoPath = $visualElements.$attr
                  Write-Host "Found logo path: $logoPath from attribute: $attr"
                  break
                }
              }
              
              if ($logoPath) {
                $logoFullPath = Join-Path (Split-Path -Parent $manifestPath.FullName) $logoPath
                if (Test-Path $logoFullPath) {
                  Write-Host "Found logo file: $logoFullPath"
                  Copy-Item $logoFullPath '${iconPath.replace(/\\/g, '\\\\')}' -Force
                  Write-Host "Successfully copied UWP app icon"
                  exit 0
                }
              }
            } catch {
              Write-Host "AppxManifest method failed: $_"
            }
          }

          # Try ExtractAssociatedIcon method
          Write-Host "Trying ExtractAssociatedIcon method..."
          try {
            $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($ExecutablePath)
            if ($icon -ne $null) {
              Write-Host "ExtractAssociatedIcon succeeded"
              if (Save-Icon $icon '${iconPath.replace(/\\/g, '\\\\')}') {
                Write-Host "Successfully saved icon using ExtractAssociatedIcon"
                exit 0
              }
            }
          } catch {
            Write-Host "ExtractAssociatedIcon failed: $_"
          }

          # Try Shell.Application method
          Write-Host "Trying Shell.Application method..."
          try {
            $shell = New-Object -ComObject Shell.Application
            $folder = $shell.Namespace((Split-Path -Parent $ExecutablePath))
            $file = $folder.ParseName((Split-Path -Leaf $ExecutablePath))
            $icon = $file.ExtractIcon(0)
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($shell) | Out-Null
            
            if ($icon -ne $null) {
              Write-Host "Shell.Application succeeded"
              if (Save-Icon $icon '${iconPath.replace(/\\/g, '\\\\')}') {
                Write-Host "Successfully saved icon using Shell.Application"
                exit 0
              }
            }
          } catch {
            Write-Host "Shell.Application method failed: $_"
          }

          Write-Error "All icon extraction methods failed"
          exit 1
        } catch {
          Write-Error "Top-level error: $_"
          exit 1
        }
      `;

      if (!execFileAsync) {
        console.error('execFileAsync is not available, cannot extract icon');
        return null;
      }

      try {
        const { stdout, stderr } = await execFileAsync('powershell', ['-Command', psScript]);
        console.log('PowerShell output:', stdout);
        
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
      } catch (error) {
        console.error('Error executing PowerShell command:', error);
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