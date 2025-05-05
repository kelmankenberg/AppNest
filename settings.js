// We'll use dynamic import to handle the ES module
let store;

async function initStore() {
    try {
        const { default: Store } = await import('electron-store');
        store = new Store({
            defaults: {
                theme: 'light',
                'font-size': '16',  // Default font size
                'icon-size': '20',  // Default icon size
                folderPreferences: {
                    folderType: 'app',  // Default to app folders
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
                }
            }
        });
        return store;
    } catch (err) {
        console.error('Failed to initialize settings store:', err);
        throw err;
    }
}

// Helper function to calculate icon size based on font size
function calculateIconSize(fontSize) {
    // For font size 9px → icon size 14px
    // For font size 14px → icon size 20px
    // Linear scaling between those points
    const minFontSize = 9;
    const maxFontSize = 14;
    const minIconSize = 14;
    const maxIconSize = 20;
    
    // Convert to number if it's a string
    fontSize = typeof fontSize === 'string' ? parseInt(fontSize) : fontSize;
    
    // Ensure fontSize is within bounds
    const boundedFontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
    
    // Calculate the proportion of the way from min to max font size
    const proportion = (boundedFontSize - minFontSize) / (maxFontSize - minFontSize);
    
    // Calculate the icon size based on that proportion
    return Math.round(minIconSize + proportion * (maxIconSize - minIconSize));
}

// Export functions that will initialize the store when called
module.exports = {
    getTheme: async () => {
        if (!store) await initStore();
        return store.get('theme');
    },
    setTheme: async (theme) => {
        if (!store) await initStore();
        store.set('theme', theme);
    },
    getFolderPreferences: async () => {
        if (!store) await initStore();
        return store.get('folderPreferences');
    },
    setFolderPreferences: async (preferences) => {
        if (!store) await initStore();
        store.set('folderPreferences', preferences);
    },
    getFontSize: async () => {
        if (!store) await initStore();
        const fontSize = store.get('font-size');
        return fontSize !== undefined ? fontSize : '16';
    },
    setFontSize: async (fontSize, iconSize) => {
        if (!store) await initStore();
        store.set('font-size', fontSize);
        
        // If icon size is provided, save it too
        if (iconSize !== undefined) {
            store.set('icon-size', iconSize);
        }
    },
    getIconSize: async () => {
        if (!store) await initStore();
        
        // Check if icon-size is set, using a safe check for store.has
        if (typeof store.has === 'function' && !store.has('icon-size')) {
            const fontSize = store.get('font-size', '16');
            const iconSize = calculateIconSize(fontSize);
            store.set('icon-size', iconSize.toString());
            return iconSize.toString();
        }
        
        return store.get('icon-size', '20');
    },
    // Export for testing
    calculateIconSize
};