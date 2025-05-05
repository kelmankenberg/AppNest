const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// Database connection
let db;

// Initialize the database
function initDatabase() {
    return new Promise((resolve, reject) => {
        // Use the user data directory for the database file
        const dbPath = path.join(app.getPath('userData'), 'launcher.db');
        
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Database opening error: ', err);
                reject(err);
                return;
            }
            
            console.log('Connected to the SQLite database');
            createTables()
                .then(() => resolve())
                .catch(err => reject(err));
        });
    });
}

// Create the database tables
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON');
            
            // Create Categories table
            db.run(`CREATE TABLE IF NOT EXISTS Categories (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                display_order INTEGER
            )`, (err) => {
                if (err) {
                    console.error('Error creating Categories table:', err);
                    reject(err);
                    return;
                }
            });
            
            // Create Applications table
            db.run(`CREATE TABLE IF NOT EXISTS Applications (
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
            )`, (err) => {
                if (err) {
                    console.error('Error creating Applications table:', err);
                    reject(err);
                    return;
                }
                
                // Add icon_path column if it doesn't exist
                db.run(`ALTER TABLE Applications ADD COLUMN icon_path TEXT`, (err) => {
                    // Ignore error if column already exists
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding icon_path column:', err);
                    }
                });
            });
            
            // Create Tags table
            db.run(`CREATE TABLE IF NOT EXISTS Tags (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            )`, (err) => {
                if (err) {
                    console.error('Error creating Tags table:', err);
                    reject(err);
                    return;
                }
            });
            
            // Create AppTags junction table
            db.run(`CREATE TABLE IF NOT EXISTS AppTags (
                app_id INTEGER,
                tag_id INTEGER,
                PRIMARY KEY (app_id, tag_id),
                FOREIGN KEY (app_id) REFERENCES Applications(id),
                FOREIGN KEY (tag_id) REFERENCES Tags(id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating AppTags table:', err);
                    reject(err);
                    return;
                }
            });
            
            // Create LaunchHistory table
            db.run(`CREATE TABLE IF NOT EXISTS LaunchHistory (
                id INTEGER PRIMARY KEY,
                app_id INTEGER,
                launch_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (app_id) REFERENCES Applications(id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating LaunchHistory table:', err);
                    reject(err);
                    return;
                }
            });
            
            // Create indexes for performance
            db.run(`CREATE INDEX IF NOT EXISTS idx_app_category ON Applications(category_id)`, (err) => {
                if (err) console.error('Error creating index idx_app_category:', err);
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_app_favorite ON Applications(is_favorite)`, (err) => {
                if (err) console.error('Error creating index idx_app_favorite:', err);
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_app_last_used ON Applications(last_used)`, (err) => {
                if (err) console.error('Error creating index idx_app_last_used:', err);
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_app_usage ON Applications(usage_count)`, (err) => {
                if (err) console.error('Error creating index idx_app_usage:', err);
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_launch_history_app ON LaunchHistory(app_id)`, (err) => {
                if (err) console.error('Error creating index idx_launch_history_app:', err);
            });
            
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
            
            defaultCategories.forEach(category => {
                insertCategory.run(category.name, category.display_order);
            });
            
            insertCategory.finalize();
            
            resolve();
        });
    });
}

// Database operations
function getAllApps() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0
            ORDER BY a.name
        `, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function getApplicationsByCategory() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0
            ORDER BY c.display_order, a.name
        `, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function getFavoriteApplications() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_favorite = 1 AND a.is_hidden = 0
            ORDER BY a.name
        `, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function getRecentlyUsedApplications(limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0 AND a.last_used IS NOT NULL
            ORDER BY a.last_used DESC
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function getMostUsedApplications(limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.is_hidden = 0 AND a.usage_count > 0
            ORDER BY a.usage_count DESC
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function searchApplications(searchTerm) {
    return new Promise((resolve, reject) => {
        const term = `%${searchTerm}%`;
        db.all(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            LEFT JOIN AppTags at ON a.id = at.app_id
            LEFT JOIN Tags t ON at.tag_id = t.id
            WHERE a.is_hidden = 0 
            AND (
                a.name LIKE ? OR 
                a.description LIKE ? OR 
                c.name LIKE ? OR 
                t.name LIKE ?
            )
            GROUP BY a.id
            ORDER BY a.name
        `, [term, term, term, term], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function addApp(application) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO Applications (
                name, executable_path, is_portable, category_id, 
                icon_path, launch_arguments, working_directory, description,
                version, publisher, launch_mode, display_order, is_favorite
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            application.name,
            application.executable_path,
            application.is_portable ? 1 : 0,
            application.category_id,
            application.icon_path || null,
            application.launch_arguments || null,
            application.working_directory || null,
            application.description || null,
            application.version || null,
            application.publisher || null,
            application.launch_mode || null,
            application.display_order || null,
            application.is_favorite ? 1 : 0
        ], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

function updateApplication(appId, application) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE Applications SET
                name = ?,
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
                is_favorite = ?
            WHERE id = ?
        `, [
            application.name,
            application.executable_path,
            application.is_portable ? 1 : 0,
            application.category_id,
            application.icon_path || null,
            application.launch_arguments || null,
            application.working_directory || null,
            application.description || null,
            application.version || null,
            application.publisher || null,
            application.launch_mode || null,
            application.display_order || null,
            application.is_favorite ? 1 : 0,
            appId
        ], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes > 0);
        });
    });
}

function deleteApplication(appId) {
    return new Promise((resolve, reject) => {
        // Begin a transaction for atomicity
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // First, delete any records in AppTags that reference this application
                db.run('DELETE FROM AppTags WHERE app_id = ?', [appId], (err) => {
                    if (err) {
                        db.run('ROLLBACK', () => reject(err));
                        return;
                    }
                    
                    // Then, delete any records in LaunchHistory that reference this application
                    db.run('DELETE FROM LaunchHistory WHERE app_id = ?', [appId], (err) => {
                        if (err) {
                            db.run('ROLLBACK', () => reject(err));
                            return;
                        }
                        
                        // Finally, delete the application itself
                        db.run('DELETE FROM Applications WHERE id = ?', [appId], function(err) {
                            if (err) {
                                db.run('ROLLBACK', () => reject(err));
                                return;
                            }
                            
                            // Commit the transaction
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK', () => reject(err));
                                    return;
                                }
                                resolve(this.changes > 0);
                            });
                        });
                    });
                });
            });
        });
    });
}

function getCategories() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, name, display_order FROM Categories ORDER BY display_order', (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function updateApplicationUsage(appId) {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();
        
        // Update the application usage
        db.run(`
            UPDATE Applications 
            SET usage_count = usage_count + 1, last_used = ? 
            WHERE id = ?
        `, [now, appId], (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Add a record to launch history
            db.run(`
                INSERT INTO LaunchHistory (app_id, launch_time) 
                VALUES (?, ?)
            `, [appId, now], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}

function getApplicationById(appId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT a.*, c.name as category_name 
            FROM Applications a 
            LEFT JOIN Categories c ON a.category_id = c.id 
            WHERE a.id = ?
        `, [appId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

// Close the database connection
function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing the database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
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
    addApplication: addApp, // Alias for test compatibility
    updateApplication,
    deleteApplication,
    updateApplicationUsage,
    getCategories,
    getApplicationById,
    closeDatabase
};