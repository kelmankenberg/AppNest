// We'll use dynamic import to handle the ES module
let store;

async function initStore() {
    try {
        const { default: Store } = await import('electron-store');
        store = new Store({
            defaults: {
                theme: 'light'
            }
        });
        return store;
    } catch (err) {
        console.error('Failed to initialize settings store:', err);
        throw err;
    }
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
    }
};