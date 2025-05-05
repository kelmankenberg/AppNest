// Release Notes Modal Implementation

/**
 * Class to handle the release notes modal functionality
 */
class ReleaseNotesModal {
    constructor() {
        this.initialized = false;
        this.modalElement = null;
    }

    /**
     * Initialize the modal structure
     */
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

    /**
     * Show the modal and load release notes
     */
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

    /**
     * Hide the modal
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    /**
     * Check if the modal is currently visible
     */
    isVisible() {
        return this.modalElement && this.modalElement.classList.contains('show');
    }

    /**
     * Load and parse release notes from the Markdown file
     */
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

    /**
     * Parse release notes markdown into HTML
     * This is a simple parser for the specific format we're using
     */
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
            
            // First, handle level 4 headers (convert them to appropriate HTML)
            content = content.replace(/#### (.+)/g, '<div class="change-subcategory">$1</div>');
            
            // Now handle level 3 headers (main categories)
            content = content.replace(/### (.+)/g, '<div class="change-category">$1</div>');
            
            // Process lists under each category or subcategory
            content = content.replace(/- (.+)/g, '<li>$1</li>');
            
            // Wrap lists in ul elements based on their preceding category or subcategory
            // Helper function to create lists with proper wrappers
            const wrapListItems = (content, categoryClass, categoryName) => {
                const regex = new RegExp(`<div class="${categoryClass}">${categoryName}<\\/div>(\\s*<li>.*?<\\/li>)+`, 'g');
                return content.replace(regex, match => {
                    // Create CSS class name based on the category
                    const cssClass = categoryName.toLowerCase().replace(/\s+/g, '-') + '-list';
                    return `<div class="${categoryClass}">${categoryName}</div><ul class="${cssClass}">${
                        match.replace(new RegExp(`<div class="${categoryClass}">${categoryName}<\\/div>\\s*`, 'g'), '')
                    }</ul>`;
                });
            };
            
            // Handle main categories
            const mainCategories = ['Features', 'Improvements', 'Bug Fixes', 'Notes', 'Technical Enhancements', 'Known Issues'];
            mainCategories.forEach(category => {
                content = wrapListItems(content, 'change-category', category);
            });
            
            // Handle subcategories
            // Find all subcategories in the content
            const subcategoryMatches = content.match(/<div class="change-subcategory">(.+?)<\/div>/g);
            if (subcategoryMatches) {
                subcategoryMatches.forEach(match => {
                    const subcategoryName = match.match(/<div class="change-subcategory">(.+?)<\/div>/)[1];
                    content = wrapListItems(content, 'change-subcategory', subcategoryName);
                });
            }
            
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

    /**
     * Highlight the current version in the release notes
     */
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
                
                // Scroll to this section
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        });
    }
}

// Create and export a singleton instance
const releaseNotesModal = new ReleaseNotesModal();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the modal structure
    releaseNotesModal.initialize();
});

// Export the modal instance for use in other modules
window.releaseNotesModal = releaseNotesModal;