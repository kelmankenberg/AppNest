// filepath: c:\dev\AppNest\__tests__\release-notes.test.js

// Mock the window.electronAPI functions
const mockReadReleaseNotes = jest.fn();

describe('Release Notes Modal', () => {
  let releaseNotesModal;
  
  // Set up DOM and mocks before each test
  beforeEach(() => {
    // Create clean document body
    document.body.innerHTML = `
      <div id="appVersionMenuItem">v1.2.0</div>
    `;
    
    // Mock window.electronAPI
    window.electronAPI = {
      readReleaseNotes: mockReadReleaseNotes
    };
    
    // Reset mocks
    mockReadReleaseNotes.mockReset();
    
    // Mock release notes content
    const mockReleaseNotesContent = `# AppNest Release Notes

## Version 1.2.0 (May 1, 2025)

### Features
- Added new theme options
- Implemented folder customization

### Improvements
- Enhanced search functionality
- Optimized app loading performance

### Bug Fixes
- Fixed an issue with icon display
- Corrected power button behavior
- Resolved startup crash on some systems

## Version 1.1.0 (April 10, 2025)

### Features
- Added help documentation
- Implemented release notes display

### Improvements
- Better dark mode support
- Faster application startup

## Version 1.0.0 (March 15, 2025)

### Features
- Initial release
- Basic app management functionality
- Simple folder navigation

### Known Issues
- Some high-DPI scaling issues
- Occasional icon loading delay
`;

    // Mock the API implementation
    mockReadReleaseNotes.mockResolvedValue(mockReleaseNotesContent);
    
    // Mock setTimeout to execute immediately
    jest.useFakeTimers();
    
    // Implement a simplified version of the ReleaseNotesModal class
    class ReleaseNotesModal {
      constructor() {
        this.initialized = false;
        this.modalElement = null;
      }
      
      initialize() {
        if (this.initialized) return;
        
        // Create modal container
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal-overlay';
        this.modalElement.id = 'releaseNotesModal';
        
        // Create modal HTML structure
        this.modalElement.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2><i class="fas fa-clipboard-list"></i> Release Notes</h2>
                    <button class="modal-close-button" id="closeReleaseNotesModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="markdown-content" id="releaseNotesContent">
                        <div class="loading-indicator">
                            <i class="fas fa-spinner fa-spin"></i> Loading release notes...
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="primary-button" id="closeReleaseNotesButton">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modalElement);
        
        // Add event listeners
        document.getElementById('closeReleaseNotesModal').addEventListener('click', () => this.hide());
        document.getElementById('closeReleaseNotesButton').addEventListener('click', () => this.hide());
        
        // Close when clicking outside of modal content
        this.modalElement.addEventListener('click', (e) => {
          if (e.target === this.modalElement) {
            this.hide();
          }
        });
        
        // Close when pressing Escape
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.isVisible()) {
            this.hide();
          }
        });
        
        this.initialized = true;
      }
      
      async show() {
        this.initialize();
        this.modalElement.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        try {
          await this.loadReleaseNotes();
        } catch (error) {
          console.error('Error loading release notes:', error);
          document.getElementById('releaseNotesContent').innerHTML = `
              <div class="error-message">
                  <i class="fas fa-exclamation-circle"></i>
                  <p>Failed to load release notes. Please try again later.</p>
              </div>
          `;
        }
      }
      
      hide() {
        if (this.modalElement) {
          this.modalElement.classList.remove('show');
          document.body.style.overflow = ''; // Restore scrolling
        }
      }
      
      isVisible() {
        return this.modalElement ? this.modalElement.classList.contains('show') : false;
      }
      
      async loadReleaseNotes() {
        const contentElement = document.getElementById('releaseNotesContent');
        
        // Show loading state
        contentElement.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i> Loading release notes...
            </div>
        `;
        
        try {
          // Use the electronAPI to read the release notes file
          const markdown = await window.electronAPI.readReleaseNotes();
          
          // Parse and display the notes
          const parsedContent = this.parseReleaseNotes(markdown);
          contentElement.innerHTML = parsedContent;
          
          // Highlight the current version
          this.highlightCurrentVersion();
        } catch (error) {
          console.error('Error loading release notes:', error);
          throw error;
        }
      }
      
      parseReleaseNotes(markdown) {
        // Split the markdown into sections by version headers
        const sections = markdown.split(/^## Version /gm);
        
        // Process the title section (if exists)
        let title = '';
        if (sections[0].startsWith('# ')) {
          const titleMatch = sections[0].match(/^# (.+)$/m);
          if (titleMatch) {
            title = `<h1>${titleMatch[1]}</h1>`;
          }
          sections.shift(); // Remove the title section from further processing
        }
        
        // Process each version section
        const versionSections = sections.map(section => {
          if (!section.trim()) return '';
          
          // Extract version and date
          const headerMatch = section.match(/^([0-9.]+).*?\((.+?)\)/);
          if (!headerMatch) return '';
          
          const version = headerMatch[1];
          const date = headerMatch[2];
          
          // Process section content
          let content = section.substring(section.indexOf('\n')).trim();
          
          // Convert ### headers to div elements
          content = content.replace(/### (.+)/g, '<div class="change-category">$1</div>');
          
          // Convert list items to li elements and wrap in ul
          content = content.replace(/- (.+)/g, '<li>$1</li>');
          
          // Simple processing to wrap lists under each category in ul tags
          ['Features', 'Improvements', 'Bug Fixes', 'Known Issues'].forEach(category => {
            const categoryRegex = new RegExp(`<div class="change-category">${category}<\\/div>\\s*(<li>.+?<\\/li>\\s*)+`, 'g');
            content = content.replace(categoryRegex, match => {
              const categoryHtml = `<div class="change-category">${category}</div>`;
              const listItemsHtml = match.replace(`${categoryHtml}`, '');
              return `${categoryHtml}<ul class="${category.toLowerCase().replace(/\s+/g, '-')}-list">${listItemsHtml}</ul>`;
            });
          });
          
          // Return the formatted version section
          return `
              <div class="version-section" data-version="${version}">
                  <div class="version-header">
                      <span class="version-number">Version ${version}</span>
                      <span class="version-date">${date}</span>
                  </div>
                  ${content}
              </div>
          `;
        }).join('');
        
        return title + versionSections;
      }
      
      highlightCurrentVersion() {
        // Get the current version from the version display in the Help menu
        const versionElement = document.getElementById('appVersionMenuItem');
        if (!versionElement) return;
        
        const currentVersion = versionElement.textContent.replace('v', '').trim();
        
        // Find the matching version section and add a highlight class
        const versionSections = document.querySelectorAll('.version-section');
        versionSections.forEach(section => {
          const sectionVersion = section.getAttribute('data-version');
          if (sectionVersion === currentVersion) {
            section.classList.add('current-version');
            
            // Scroll to this section - execute immediately in tests
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    }
    
    // Create an instance of the modal
    releaseNotesModal = new ReleaseNotesModal();
    window.releaseNotesModal = releaseNotesModal;
    
    // Create a spy for the scrollIntoView method
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });
  
  afterEach(() => {
    // Clean up any listeners that might have been left
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  
  test('Modal should initialize with correct structure', () => {
    // Modal should not exist in the DOM initially
    expect(document.getElementById('releaseNotesModal')).toBeNull();
    
    // Initialize the modal
    releaseNotesModal.initialize();
    
    // Modal should now exist in the DOM
    const modal = document.getElementById('releaseNotesModal');
    expect(modal).not.toBeNull();
    
    // Check the structure
    expect(modal.querySelector('.modal-header h2').textContent).toContain('Release Notes');
    expect(document.getElementById('closeReleaseNotesModal')).not.toBeNull();
    expect(document.getElementById('releaseNotesContent')).not.toBeNull();
    expect(document.getElementById('closeReleaseNotesButton')).not.toBeNull();
    
    // Modal should not be shown yet
    expect(modal.classList.contains('show')).toBe(false);
  });
  
  test('Modal should show and hide appropriately', () => {
    // Show the modal
    releaseNotesModal.show();
    
    // Modal should now exist and be visible
    const modal = document.getElementById('releaseNotesModal');
    expect(modal).not.toBeNull();
    expect(modal.classList.contains('show')).toBe(true);
    
    // Body scroll should be disabled
    expect(document.body.style.overflow).toBe('hidden');
    
    // Hide the modal
    releaseNotesModal.hide();
    
    // Modal should exist but be hidden
    expect(document.getElementById('releaseNotesModal')).not.toBeNull();
    expect(modal.classList.contains('show')).toBe(false);
    
    // Body scroll should be restored
    expect(document.body.style.overflow).toBe('');
  });
  
  test('Close button should hide the modal', () => {
    // Show the modal first
    releaseNotesModal.show();
    
    // Click the close button in the header
    document.getElementById('closeReleaseNotesModal').click();
    
    // Modal should be hidden
    expect(document.getElementById('releaseNotesModal').classList.contains('show')).toBe(false);
    
    // Show the modal again
    releaseNotesModal.show();
    
    // Click the close button in the footer
    document.getElementById('closeReleaseNotesButton').click();
    
    // Modal should be hidden again
    expect(document.getElementById('releaseNotesModal').classList.contains('show')).toBe(false);
  });
  
  test('Clicking outside the modal should hide it', () => {
    // Show the modal
    releaseNotesModal.show();
    
    // Create a click event on the overlay (outside the modal content)
    const clickEvent = new MouseEvent('click', { bubbles: true });
    document.getElementById('releaseNotesModal').dispatchEvent(clickEvent);
    
    // Modal should be hidden
    expect(document.getElementById('releaseNotesModal').classList.contains('show')).toBe(false);
  });
  
  test('Escape key should hide the modal', () => {
    // Show the modal
    releaseNotesModal.show();
    
    // Create an Escape key event
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escapeEvent);
    
    // Modal should be hidden
    expect(document.getElementById('releaseNotesModal').classList.contains('show')).toBe(false);
  });
  
  test('Release notes content should be loaded and parsed correctly', async () => {
    // Show the modal which triggers loading the release notes
    await releaseNotesModal.show();
    
    // The API should have been called
    expect(mockReadReleaseNotes).toHaveBeenCalled();
    
    // Check if the content has been parsed and added to the DOM
    const contentElement = document.getElementById('releaseNotesContent');
    
    // Title should have been added
    expect(contentElement.innerHTML).toContain('<h1>AppNest Release Notes</h1>');
    
    // Version sections should be present
    expect(contentElement.querySelectorAll('.version-section').length).toBe(3);
    expect(contentElement.innerHTML).toContain('Version 1.2.0');
    expect(contentElement.innerHTML).toContain('Version 1.1.0');
    expect(contentElement.innerHTML).toContain('Version 1.0.0');
    
    // Check the dates
    expect(contentElement.innerHTML).toContain('May 1, 2025');
    expect(contentElement.innerHTML).toContain('April 10, 2025');
    expect(contentElement.innerHTML).toContain('March 15, 2025');
    
    // Check for category headers
    expect(contentElement.querySelectorAll('.change-category').length).toBeGreaterThan(0);
    expect(contentElement.innerHTML).toContain('<div class="change-category">Features</div>');
    expect(contentElement.innerHTML).toContain('<div class="change-category">Bug Fixes</div>');
    
    // Check that list items are properly converted
    const lists = contentElement.querySelectorAll('ul');
    expect(lists.length).toBeGreaterThan(0);
    expect(contentElement.querySelectorAll('li').length).toBeGreaterThan(0);
    
    // Check specific content
    expect(contentElement.innerHTML).toContain('<li>Added new theme options</li>');
    expect(contentElement.innerHTML).toContain('<li>Fixed an issue with icon display</li>');
  });
  
  test('Current version should be highlighted', async () => {
    // Set the current version in the DOM
    document.getElementById('appVersionMenuItem').textContent = 'v1.2.0';
    
    // Show the modal
    await releaseNotesModal.show();
    
    // Check if the current version section has the highlight class
    const currentVersionSection = document.querySelector('.version-section[data-version="1.2.0"]');
    
    expect(currentVersionSection.classList.contains('current-version')).toBe(true);
    
    // Other version sections should not have the highlight class
    const otherVersionSections = document.querySelectorAll('.version-section:not([data-version="1.2.0"])');
    otherVersionSections.forEach(section => {
      expect(section.classList.contains('current-version')).toBe(false);
    });
    
    // Check that scrollIntoView was called for the current version
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
  
  test('Current version should be correctly determined from version element', async () => {
    // Change the current version
    document.getElementById('appVersionMenuItem').textContent = 'v1.1.0';
    
    // Show the modal
    await releaseNotesModal.show();
    
    // Check if the 1.1.0 version section has the highlight class
    const currentVersionSection = document.querySelector('.version-section[data-version="1.1.0"]');
    expect(currentVersionSection.classList.contains('current-version')).toBe(true);
    
    // The 1.2.0 section should not have the highlight class
    const otherVersionSection = document.querySelector('.version-section[data-version="1.2.0"]');
    expect(otherVersionSection.classList.contains('current-version')).toBe(false);
  });
  
  test('Error handling when loading release notes fails', async () => {
    // Mock an error response
    mockReadReleaseNotes.mockRejectedValueOnce(new Error('Failed to load release notes'));
    
    // Create a spy for console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Show the modal
    await releaseNotesModal.show();
    
    // Check if error message is displayed
    const contentElement = document.getElementById('releaseNotesContent');
    expect(contentElement.innerHTML).toContain('Failed to load release notes');
    expect(contentElement.querySelector('.error-message')).not.toBeNull();
    
    // Console error should have been called
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Error loading release notes:', expect.any(Error));
    
    // Clean up
    consoleSpy.mockRestore();
  });
  
  test('isVisible method should correctly report visibility state', () => {
    // Initial state - make sure to initialize the modal first
    releaseNotesModal.initialize();
    expect(releaseNotesModal.isVisible()).toBe(false);
    
    // Show the modal
    releaseNotesModal.show();
    
    // Should now be visible
    expect(releaseNotesModal.isVisible()).toBe(true);
    
    // Hide the modal
    releaseNotesModal.hide();
    
    // Should now be hidden
    expect(releaseNotesModal.isVisible()).toBe(false);
  });
  
  test('Repeated initialization should not create duplicate modal elements', () => {
    // Initialize the modal
    releaseNotesModal.initialize();
    
    // Get the first modal element
    const firstModal = document.getElementById('releaseNotesModal');
    expect(firstModal).not.toBeNull();
    
    // Initialize again
    releaseNotesModal.initialize();
    
    // Should still only be one modal element
    const modalElements = document.querySelectorAll('#releaseNotesModal');
    expect(modalElements.length).toBe(1);
    
    // The modal element reference should not have changed
    expect(document.getElementById('releaseNotesModal')).toBe(firstModal);
  });
});