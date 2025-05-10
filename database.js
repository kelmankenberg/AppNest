const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Database connection
let db;

// Initialize the database
function initDatabase() {
    try {
        // Use the user data directory for the database file
        const dbPath = path.join(app.getPath('userData'), 'launcher.db');
        
        db = new Database(dbPath);
        console.log('Connected to the SQLite database');
        
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        
        createTables();
        return Promise.resolve();
    } catch (err) {
        console.error('Database opening error: ', err);
        return Promise.reject(err);
    }
}

// Create the database tables
function createTables() {
    try {
        // Create Categories table
        db.exec(`CREATE TABLE IF NOT EXISTS Categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            display_order INTEGER
        )`);
        
        // Create Applications table
        db.exec(`CREATE TABLE IF NOT EXISTS Applications (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            executable_path TEXT NOT NULL,
            is_portable INTEGER NOT NULL,
            category_id INTEGER,
            icon_path TEXT,
            launch_arguments TEXT,
            working_directory TEXT,
            description TEXT,
            last_used DATETIME,
            usage_count INTEGER DEFAULT 0,
            version TEXT,
            publisher TEXT,
            launch_mode TEXT,
            added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            display_order INTEGER,
            is_favorite INTEGER DEFAULT 0,
            is_hidden INTEGER DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES Categories(id)
        )`);

        // Add icon_path column if it doesn't exist
        try {
            db.exec(`ALTER TABLE Applications ADD COLUMN icon_path TEXT`);
        } catch (err) {
            // Ignore error if column already exists
            if (!err.message.includes('duplicate column name')) {
                console.error('Error adding icon_path column:', err);
            }
        }
        
        // Create Tags table
        db.exec(`CREATE TABLE IF NOT EXISTS Tags (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )`);
        
        // Create AppTags junction table
        db.exec(`CREATE TABLE IF NOT EXISTS AppTags (
            app_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (app_id, tag_id),
            FOREIGN KEY (app_id) REFERENCES Applications(id),
            FOREIGN KEY (tag_id) REFERENCES Tags(id)
        )`);
        
        // Create LaunchHistory table
        db.exec(`CREATE TABLE IF NOT EXISTS LaunchHistory (
            id INTEGER PRIMARY KEY,
            app_id INTEGER,
            launch_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id) REFERENCES Applications(id)
        )`);
        
        // Create indexes for performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_app_category ON Applications(category_id);
            CREATE INDEX IF NOT EXISTS idx_app_favorite ON Applications(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_app_last_used ON Applications(last_used);
            CREATE INDEX IF NOT EXISTS idx_app_usage ON Applications(usage_count);
            CREATE INDEX IF NOT EXISTS idx_launch_history_app ON LaunchHistory(app_id);
        `);
        
        // Insert default categories if they don't exist
        const defaultCategories = [
            { name: 'Accessibility', display_order: 1 },
            { name: 'Development', display_order: 2 },
            { name: 'Education', display_order: 3 },
            { name: 'Games', display_order: 4 },
            { name: 'Graphics & Pictures', display_order: 5 },
            { name: 'Internet', display_order: 6 },
            { name: 'Media', display_order: 7 },
            { name: 'Office', display_order: 8 },
            { name: 'Productivity', display_order: 9 },
            { name: 'Security', display_order: 10 },
            { name: 'Utilities', display_order: 11 }
        ];
        
        const insertCategory = db.prepare('INSERT OR IGNORE INTO Categories (name, display_order) VALUES (?, ?)');
        
        for (const category of defaultCategories) {
            insertCategory.run(category.name, category.display_order);
        }
        
        return Promise.resolve();
    } catch (err) {
        console.error('Error creating tables:', err);
        return Promise.reject(err);
    }
}

// Database operations
function getAllApps() {
    try {
        return db.prepare(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0
            ORDER BY a.name
        `).all();
    } catch (err) {
        console.error('Error getting all apps:', err);
        throw err;
    }
}

function getApplicationsByCategory() {
    try {
        return db.prepare(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0
            ORDER BY c.display_order, a.name
        `).all();
    } catch (err) {
        console.error('Error getting applications by category:', err);
        throw err;
    }
}

function getFavoriteApplications() {
    try {
        return db.prepare(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_favorite = 1 AND a.is_hidden = 0
            ORDER BY a.name
        `).all();
    } catch (err) {
        console.error('Error getting favorite applications:', err);
        throw err;
    }
}

function getRecentlyUsedApplications(limit = 10) {
    try {
        return db.prepare(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0
            ORDER BY a.last_used DESC
            LIMIT ?
        `).all(limit);
    } catch (err) {
        console.error('Error getting recently used applications:', err);
        throw err;
    }
}

function getMostUsedApplications(limit = 10) {
    try {
        return db.prepare(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0
            ORDER BY a.usage_count DESC
            LIMIT ?
        `).all(limit);
    } catch (err) {
        console.error('Error getting most used applications:', err);
        throw err;
    }
}

function searchApplications(searchTerm) {
    try {
        const searchPattern = `%${searchTerm}%`;
        return db.prepare(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0
            AND (
                a.name LIKE ? OR 
                a.description LIKE ? OR 
                a.publisher LIKE ? OR
                c.name LIKE ?
            )
            ORDER BY a.name
        `).all(searchPattern, searchPattern, searchPattern, searchPattern);
    } catch (err) {
        console.error('Error searching applications:', err);
        throw err;
    }
}

function addApp(application) {
    try {
        const stmt = db.prepare(`
            INSERT INTO Applications (
                name, executable_path, is_portable, category_id, 
                icon_path, launch_arguments, working_directory, 
                description, version, publisher, launch_mode, 
                display_order, is_favorite, is_hidden
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            application.name,
            application.executable_path,
            application.is_portable ? 1 : 0,
            application.category_id,
            application.icon_path,
            application.launch_arguments,
            application.working_directory,
            application.description,
            application.version,
            application.publisher,
            application.launch_mode,
            application.display_order,
            application.is_favorite ? 1 : 0,
            application.is_hidden ? 1 : 0
        );

        return result.lastInsertRowid;
    } catch (err) {
        console.error('Error adding application:', err);
        throw err;
    }
}

function updateApplication(appId, application) {
    try {
        const stmt = db.prepare(`
            UPDATE Applications 
            SET name = ?,
                executable_path = ?,
                is_portable = ?,
                category_id = ?,
                icon_path = ?,
                launch_arguments = ?,
                working_directory = ?,
                description = ?,
                version = ?,
                publisher = ?,
                launch_mode = ?,
                display_order = ?,
                is_favorite = ?,
                is_hidden = ?
            WHERE id = ?
        `);

        stmt.run(
            application.name,
            application.executable_path,
            application.is_portable ? 1 : 0,
            application.category_id,
            application.icon_path,
            application.launch_arguments,
            application.working_directory,
            application.description,
            application.version,
            application.publisher,
            application.launch_mode,
            application.display_order,
            application.is_favorite ? 1 : 0,
            application.is_hidden ? 1 : 0,
            appId
        );

        return true;
    } catch (err) {
        console.error('Error updating application:', err);
        throw err;
    }
}

function deleteApplication(appId) {
    try {
        // Start a transaction
        db.prepare('BEGIN').run();

        try {
            // Delete related records first
            db.prepare('DELETE FROM AppTags WHERE app_id = ?').run(appId);
            db.prepare('DELETE FROM LaunchHistory WHERE app_id = ?').run(appId);
            
            // Delete the application
            db.prepare('DELETE FROM Applications WHERE id = ?').run(appId);

            // Commit the transaction
            db.prepare('COMMIT').run();
            return true;
        } catch (err) {
            // Rollback on error
            db.prepare('ROLLBACK').run();
            throw err;
        }
    } catch (err) {
        console.error('Error deleting application:', err);
        throw err;
    }
}

function getCategories() {
    try {
        return db.prepare(`
            SELECT * FROM Categories 
            ORDER BY display_order, name
        `).all();
    } catch (err) {
        console.error('Error getting categories:', err);
        throw err;
    }
}

function updateApplicationUsage(appId) {
    try {
        const now = new Date().toISOString();
        
        // Update the application's usage count and last used time
        db.prepare(`
            UPDATE Applications 
            SET usage_count = usage_count + 1,
                last_used = ?
            WHERE id = ?
        `).run(now, appId);

        // Add an entry to the launch history
        db.prepare(`
            INSERT INTO LaunchHistory (app_id, launch_time)
            VALUES (?, ?)
        `).run(appId, now);

        return true;
    } catch (err) {
        console.error('Error updating application usage:', err);
        throw err;
    }
}

function getApplicationById(appId) {
    try {
        return db.prepare(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.id = ?
        `).get(appId);
    } catch (err) {
        console.error('Error getting application by ID:', err);
        throw err;
    }
}

// Close the database connection
function closeDatabase() {
    try {
        if (db) {
            db.close();
            console.log('Database connection closed');
        }
    } catch (err) {
        console.error('Error closing database:', err);
        throw err;
    }
}

module.exports = {
    initDatabase,
    getAllApps,
    getApplicationsByCategory,
    getFavoriteApplications,
    getRecentlyUsedApplications,
    getMostUsedApplications,
    searchApplications,
    addApp,
    updateApplication,
    deleteApplication,
    getCategories,
    updateApplicationUsage,
    getApplicationById,
    closeDatabase
};