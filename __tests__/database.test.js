const path = require('path');

// Mock the electron module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}));

// Mock sqlite3
jest.mock('sqlite3', () => {
  const mockDb = {
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
    prepare: jest.fn(),
    serialize: jest.fn(callback => callback()),
    close: jest.fn()
  };
  
  mockDb.prepare.mockReturnValue({
    run: jest.fn(),
    finalize: jest.fn()
  });

  return {
    verbose: jest.fn().mockReturnValue({
      Database: jest.fn().mockImplementation((path, callback) => {
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback(null);
          }
        }, 0);
        return mockDb;
      })
    })
  };
});

// After mocking, import the database module
const database = require('../database');
const sqlite3 = require('sqlite3').verbose();

describe('Database Module', () => {
  let mockDb;
  
  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
    
    // Access the mocked database instance
    mockDb = new sqlite3.Database();
  });

  describe('initDatabase', () => {
    it('should initialize the database and create tables', async () => {
      await database.initDatabase();
      
      // Check if Database constructor was called with the correct path
      const { app } = require('electron');
      expect(app.getPath).toHaveBeenCalledWith('userData');
      expect(sqlite3.Database).toHaveBeenCalled();
      
      // Verify that serialize was called to create tables
      expect(mockDb.serialize).toHaveBeenCalled();
    });
  });

  describe('getAllApplications', () => {
    it('should fetch all applications', async () => {
      // Set up mock to return sample applications
      const mockApplications = [
        { id: 1, name: 'App 1', category_name: 'Development' },
        { id: 2, name: 'App 2', category_name: 'Productivity' }
      ];
      
      mockDb.all.mockImplementation((query, callback) => {
        callback(null, mockApplications);
      });
      
      const result = await database.getAllApplications();
      
      // Verify the query contains the right parts without being too strict on formatting
      expect(mockDb.all).toHaveBeenCalled();
      const query = mockDb.all.mock.calls[0][0];
      expect(query).toContain('SELECT a.*, c.name as category_name');
      expect(query).toContain('FROM Applications a');
      expect(query).toContain('LEFT JOIN Categories c ON a.category_id = c.id');
      
      // Verify the returned data
      expect(result).toEqual(mockApplications);
    });
  });

  describe('getApplicationsByCategory', () => {
    it('should fetch applications grouped by category', async () => {
      // Set up mock to return sample applications
      const mockApplications = [
        { id: 1, name: 'App 1', category_name: 'Development', category_id: 1 },
        { id: 2, name: 'App 2', category_name: 'Productivity', category_id: 2 }
      ];
      
      mockDb.all.mockImplementation((query, callback) => {
        callback(null, mockApplications);
      });
      
      const result = await database.getApplicationsByCategory();
      
      // Verify the query contains the right parts
      expect(mockDb.all).toHaveBeenCalled();
      const query = mockDb.all.mock.calls[0][0];
      expect(query).toContain('SELECT a.*, c.name as category_name');
      expect(query).toContain('FROM Applications a');
      expect(query).toContain('LEFT JOIN Categories c ON a.category_id = c.id');
      expect(query).toContain('ORDER BY c.display_order, a.name');
      
      // Verify the returned data
      expect(result).toEqual(mockApplications);
    });
  });

  describe('getFavoriteApplications', () => {
    it('should fetch favorite applications', async () => {
      // Set up mock to return sample favorites
      const mockFavorites = [
        { id: 1, name: 'Favorite App 1', is_favorite: 1, category_name: 'Development' },
        { id: 2, name: 'Favorite App 2', is_favorite: 1, category_name: 'Productivity' }
      ];
      
      mockDb.all.mockImplementation((query, callback) => {
        callback(null, mockFavorites);
      });
      
      const result = await database.getFavoriteApplications();
      
      // Verify the query contains the right parts
      expect(mockDb.all).toHaveBeenCalled();
      const query = mockDb.all.mock.calls[0][0];
      expect(query).toContain('SELECT a.*, c.name as category_name');
      expect(query).toContain('FROM Applications a');
      expect(query).toContain('LEFT JOIN Categories c ON a.category_id = c.id');
      expect(query).toContain('WHERE a.is_favorite = 1');
      
      // Verify the returned data
      expect(result).toEqual(mockFavorites);
    });
  });

  describe('getRecentlyUsedApplications', () => {
    it('should fetch recently used applications with default limit of 10', async () => {
      // Set up mock to return sample recent applications
      const mockRecent = [
        { id: 1, name: 'Recent App 1', last_used: '2023-04-29T12:00:00.000Z' },
        { id: 2, name: 'Recent App 2', last_used: '2023-04-28T14:30:00.000Z' }
      ];
      
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockRecent);
      });
      
      const result = await database.getRecentlyUsedApplications();
      
      // Verify the query and parameters
      expect(mockDb.all).toHaveBeenCalled();
      const query = mockDb.all.mock.calls[0][0];
      const params = mockDb.all.mock.calls[0][1];
      expect(query).toContain('SELECT a.*, c.name as category_name');
      expect(query).toContain('ORDER BY a.last_used DESC');
      expect(query).toContain('LIMIT ?');
      expect(params).toEqual([10]); // Default limit
      
      // Verify the returned data
      expect(result).toEqual(mockRecent);
    });

    it('should respect custom limit parameter', async () => {
      const customLimit = 5;
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });
      
      await database.getRecentlyUsedApplications(customLimit);
      
      // Check if limit was correctly passed
      const params = mockDb.all.mock.calls[0][1];
      expect(params).toEqual([customLimit]);
    });
  });

  describe('getMostUsedApplications', () => {
    it('should fetch most used applications with default limit of 10', async () => {
      // Set up mock to return sample most used applications
      const mockMostUsed = [
        { id: 1, name: 'Most Used App 1', usage_count: 50 },
        { id: 2, name: 'Most Used App 2', usage_count: 30 }
      ];
      
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockMostUsed);
      });
      
      const result = await database.getMostUsedApplications();
      
      // Verify the query and parameters
      expect(mockDb.all).toHaveBeenCalled();
      const query = mockDb.all.mock.calls[0][0];
      const params = mockDb.all.mock.calls[0][1];
      expect(query).toContain('SELECT a.*, c.name as category_name');
      expect(query).toContain('WHERE a.is_hidden = 0 AND a.usage_count > 0');
      expect(query).toContain('ORDER BY a.usage_count DESC');
      expect(query).toContain('LIMIT ?');
      expect(params).toEqual([10]); // Default limit
      
      // Verify the returned data
      expect(result).toEqual(mockMostUsed);
    });

    it('should respect custom limit parameter', async () => {
      const customLimit = 5;
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });
      
      await database.getMostUsedApplications(customLimit);
      
      // Check if limit was correctly passed
      const params = mockDb.all.mock.calls[0][1];
      expect(params).toEqual([customLimit]);
    });
  });

  describe('searchApplications', () => {
    it('should search applications based on search term', async () => {
      const searchTerm = 'test';
      const expectedTerm = '%test%';
      const mockResults = [
        { id: 1, name: 'Test App 1', description: 'Test description' },
        { id: 2, name: 'App with test in name', category_name: 'Test Category' }
      ];
      
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockResults);
      });
      
      const result = await database.searchApplications(searchTerm);
      
      // Verify the query and parameters
      expect(mockDb.all).toHaveBeenCalled();
      const query = mockDb.all.mock.calls[0][0];
      const params = mockDb.all.mock.calls[0][1];
      expect(query).toContain('SELECT a.*, c.name as category_name');
      expect(query).toContain('LEFT JOIN AppTags at ON a.id = at.app_id');
      expect(query).toContain('LEFT JOIN Tags t ON at.tag_id = t.id');
      expect(query).toContain('WHERE a.is_hidden = 0');
      expect(query).toContain('GROUP BY a.id');
      expect(params).toEqual([expectedTerm, expectedTerm, expectedTerm, expectedTerm]);
      
      // Verify the returned data
      expect(result).toEqual(mockResults);
    });
  });

  describe('addApplication', () => {
    it('should add a new application', async () => {
      const newApp = {
        name: 'New App',
        executable_path: 'C:\\Program Files\\NewApp\\app.exe',
        is_portable: false,
        category_id: 1
      };
      
      // Mock the run method to simulate a successful insert
      mockDb.run.mockImplementation(function(query, params, callback) {
        this.lastID = 123;
        callback.call(this);
      });
      
      const newId = await database.addApplication(newApp);
      
      // Verify the correct query was used
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Applications'),
        expect.arrayContaining([newApp.name, newApp.executable_path]),
        expect.any(Function)
      );
      
      // Verify the returned ID
      expect(newId).toBe(123);
    });
  });

  describe('updateApplication', () => {
    it('should update an existing application', async () => {
      const appId = 1;
      const updatedApp = {
        name: 'Updated App',
        executable_path: 'C:\\Program Files\\UpdatedApp\\app.exe',
        is_portable: true,
        category_id: 2
      };
      
      // Mock the run method to simulate a successful update
      mockDb.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this);
      });
      
      const result = await database.updateApplication(appId, updatedApp);
      
      // Verify the correct query was used
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Applications SET'),
        expect.arrayContaining([updatedApp.name, updatedApp.executable_path, appId]),
        expect.any(Function)
      );
      
      // Verify the returned result
      expect(result).toBe(true);
    });
  });

  describe('deleteApplication', () => {
    it('should delete an application', async () => {
      const appId = 1;
      
      // Set up a better mock implementation for the transaction operations
      mockDb.run.mockImplementation(function(query, params, callback) {
        // If params is a function, it means it's actually the callback
        if (typeof params === 'function') {
          callback = params;
          params = [];
        }
        
        // Set changes to 1 for the DELETE operation
        if (query === 'DELETE FROM Applications WHERE id = ?') {
          this.changes = 1;
        }
        
        // Immediately call the callback if it's provided
        if (typeof callback === 'function') {
          callback.call(this);
        }
        
        return this;
      });
      
      const result = await database.deleteApplication(appId);
      
      // Verify transaction was started and committed
      expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION', expect.any(Function));
      expect(mockDb.run).toHaveBeenCalledWith('COMMIT', expect.any(Function));
      
      // Verify the returned result
      expect(result).toBe(true);
    });
  });

  describe('updateApplicationUsage', () => {
    it('should update application usage count and add launch history', async () => {
      const appId = 1;

      // Mock Date.now to return a consistent date for testing
      const mockDate = new Date('2025-04-30T10:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      // Mock run for first and second operations
      let runCallCount = 0;
      mockDb.run.mockImplementation((query, params, callback) => {
        runCallCount++;
        // First call updates the application usage
        // Second call adds launch history
        if (typeof callback === 'function') {
          callback(null);
        }
      });
      
      await database.updateApplicationUsage(appId);
      
      // Verify both database operations were called
      expect(mockDb.run).toHaveBeenCalledTimes(2);
      
      // First call should update usage count
      expect(mockDb.run.mock.calls[0][0]).toContain('UPDATE Applications');
      expect(mockDb.run.mock.calls[0][0]).toContain('SET usage_count = usage_count + 1');
      
      // Second call should insert into launch history
      expect(mockDb.run.mock.calls[1][0]).toContain('INSERT INTO LaunchHistory');
      
      // Restore the original Date implementation
      global.Date.mockRestore();
    });
  });

  describe('getCategories', () => {
    it('should fetch all categories ordered by display_order and name', async () => {
      const mockCategories = [
        { id: 1, name: 'Development', display_order: 2 },
        { id: 2, name: 'Productivity', display_order: 1 }
      ];
      
      mockDb.all.mockImplementation((query, callback) => {
        callback(null, mockCategories);
      });
      
      const result = await database.getCategories();
      
      // Verify the query
      expect(mockDb.all).toHaveBeenCalled();
      const query = mockDb.all.mock.calls[0][0];
      expect(query).toContain('SELECT * FROM Categories');
      expect(query).toContain('ORDER BY display_order, name');
      
      // Verify the returned data
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getApplicationById', () => {
    it('should fetch an application by its ID', async () => {
      const appId = 1;
      const mockApp = { 
        id: 1, 
        name: 'Test App', 
        executable_path: 'C:\\path\\to\\app.exe',
        category_id: 2,
        category_name: 'Development'
      };
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockApp);
      });
      
      const result = await database.getApplicationById(appId);
      
      // Verify the query and parameters
      expect(mockDb.get).toHaveBeenCalled();
      const query = mockDb.get.mock.calls[0][0];
      const params = mockDb.get.mock.calls[0][1];
      expect(query).toContain('SELECT a.*, c.name as category_name');
      expect(query).toContain('FROM Applications a');
      expect(query).toContain('LEFT JOIN Categories c ON a.category_id = c.id');
      expect(query).toContain('WHERE a.id = ?');
      expect(params).toEqual([appId]);
      
      // Verify the returned data
      expect(result).toEqual(mockApp);
    });

    it('should handle non-existent application IDs', async () => {
      const nonExistentId = 999;
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, undefined);
      });
      
      const result = await database.getApplicationById(nonExistentId);
      
      // Verify undefined is returned for non-existent IDs
      expect(result).toBeUndefined();
    });
  });

  describe('closeDatabase', () => {
    it('should close the database connection', () => {
      // Call the function
      database.closeDatabase();
      
      // Verify close was called
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle errors when closing the database', () => {
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock an error when closing
      const error = new Error('Failed to close database');
      mockDb.close.mockImplementation(callback => {
        callback(error);
      });
      
      // Call the function
      database.closeDatabase();
      
      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith('Error closing the database:', error);
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});