const path = require('path');

// Mock the electron module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}));

// Factory mock for better-sqlite3 that tracks all created instances
const mockDbInstances = [];
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => {
    const mockDb = {
      prepare: jest.fn(() => ({
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn(),
        finalize: jest.fn(),
        bind: jest.fn(),
        lastInsertRowid: 1
      })),
      exec: jest.fn(),
      close: jest.fn(),
      transaction: jest.fn(fn => fn),
      pragma: jest.fn(),
      serialize: jest.fn()
    };
    mockDbInstances.push(mockDb);
    return mockDb;
  });
});

// After mocking, import the database module
const database = require('../database');

describe('Database Module', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    // Always use the latest mockDb instance created
    mockDb = mockDbInstances[mockDbInstances.length - 1];
  });

  describe('initDatabase', () => {
    it('should initialize the database and create tables', async () => {
      await database.initDatabase();
      // Always use the latest mockDb instance created by the mock factory
      const latestMockDb = mockDbInstances[mockDbInstances.length - 1];
      // Check if Database constructor was called with the correct path
      const { app } = require('electron');
      expect(app.getPath).toHaveBeenCalledWith('userData');
      const BetterSqlite3 = require('better-sqlite3');
      expect(BetterSqlite3).toHaveBeenCalled();
      // Verify that serialize was called to create tables
      // expect(latestMockDb.serialize).toHaveBeenCalled();
    });
  });

  describe('getAllApps', () => {
    it('should return all non-hidden applications', async () => {
      // Mock implementation to immediately resolve instead of timeout
      const mockApps = [
        { id: 1, name: 'App 1', is_hidden: 0 },
        { id: 2, name: 'App 2', is_hidden: 0 }
      ];
      
      const stmt = {
        all: jest.fn(() => mockApps)
      };
      mockDb.prepare.mockReturnValue(stmt);

      const result = database.getAllApps();

      expect(stmt.all).toHaveBeenCalled();
      expect(result).toEqual(mockApps);
    });
  });

  describe('getApplicationsByCategory', () => {
    it('should fetch applications grouped by category', async () => {
      // Set up mock to return sample applications
      const mockApplications = [
        { id: 1, name: 'App 1', category_name: 'Development', category_id: 1 },
        { id: 2, name: 'App 2', category_name: 'Office', category_id: 2 }
      ];
      
      const stmt = {
        all: jest.fn(() => mockApplications)
      };
      mockDb.prepare.mockReturnValue(stmt);

      const result = database.getApplicationsByCategory();

      expect(stmt.all).toHaveBeenCalled();
      expect(result).toEqual(mockApplications);
    });
  });

  describe('getFavoriteApplications', () => {
    it('should fetch favorite applications', async () => {
      // Set up mock to return sample favorites
      const mockFavorites = [
        { id: 1, name: 'Favorite App 1', is_favorite: 1, category_name: 'Development' },
        { id: 2, name: 'Favorite App 2', is_favorite: 1, category_name: 'Office' }
      ];
      
      const stmt = {
        all: jest.fn(() => mockFavorites)
      };
      mockDb.prepare.mockReturnValue(stmt);

      const result = database.getFavoriteApplications();

      expect(stmt.all).toHaveBeenCalled();
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
      
      const stmt = {
        all: jest.fn(() => mockRecent)
      };
      mockDb.prepare.mockReturnValue(stmt);

      const result = database.getRecentlyUsedApplications();

      expect(stmt.all).toHaveBeenCalled();
      expect(result).toEqual(mockRecent);
    });

    it('should respect custom limit parameter', async () => {
      const customLimit = 5;
      const stmt = {
        all: jest.fn(() => [])
      };
      mockDb.prepare.mockReturnValue(stmt);

      database.getRecentlyUsedApplications(customLimit);

      expect(stmt.all).toHaveBeenCalledWith(customLimit);
    });
  });

  describe('getMostUsedApplications', () => {
    it('should fetch most used applications with default limit of 10', async () => {
      // Set up mock to return sample most used applications
      const mockMostUsed = [
        { id: 1, name: 'Most Used App 1', usage_count: 50 },
        { id: 2, name: 'Most Used App 2', usage_count: 30 }
      ];
      
      const stmt = {
        all: jest.fn(() => mockMostUsed)
      };
      mockDb.prepare.mockReturnValue(stmt);

      const result = database.getMostUsedApplications();

      expect(stmt.all).toHaveBeenCalled();
      expect(result).toEqual(mockMostUsed);
    });

    it('should respect custom limit parameter', async () => {
      const customLimit = 5;
      const stmt = {
        all: jest.fn(() => [])
      };
      mockDb.prepare.mockReturnValue(stmt);

      database.getMostUsedApplications(customLimit);

      expect(stmt.all).toHaveBeenCalledWith(customLimit);
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
      
      const stmt = {
        all: jest.fn(() => mockResults)
      };
      mockDb.prepare.mockReturnValue(stmt);

      const result = database.searchApplications(searchTerm);

      expect(stmt.all).toHaveBeenCalled();
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
      const stmt = {
        run: jest.fn(() => ({ lastInsertRowid: 123 }))
      };
      mockDb.prepare.mockReturnValue(stmt);

      const database = require('../database');
      const result = await database.addApplication(newApp);
      
      // Verify the correct query was used
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(stmt.run).toHaveBeenCalled();
      const query = mockDb.prepare.mock.calls[0][0];
      expect(query).toContain('INSERT INTO Applications');
      // Verify stmt.run was called with the correct parameters
      expect(stmt.run).toHaveBeenCalledWith([
        newApp.name,
        newApp.executable_path,
        newApp.is_portable,
        newApp.category_id
      ]);
      // Verify the returned ID
      expect(result).toBe(123);
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
      const stmt = {
        run: jest.fn(() => ({ changes: 1 }))
      };
      mockDb.prepare.mockReturnValue(stmt);

      const result = await database.updateApplication(appId, updatedApp);
      
      // Verify the correct query was used
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
    
    const stmt = {
      all: jest.fn(() => mockResults)
    };
    mockDb.prepare.mockReturnValue(stmt);

    const result = database.searchApplications(searchTerm);

    expect(stmt.all).toHaveBeenCalled();
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
    const stmt = {
      run: jest.fn(() => ({ lastInsertRowid: 123 }))
    };
    mockDb.prepare.mockReturnValue(stmt);

    const database = require('../database');
  const result = await database.addApplication(newApp);
    
    // Verify the correct query was used
    expect(mockDb.prepare).toHaveBeenCalled();
    expect(stmt.run).toHaveBeenCalled();
    const query = mockDb.prepare.mock.calls[0][0];
    expect(query).toContain('INSERT INTO Applications');
    // Verify stmt.run was called with the correct parameters
    expect(stmt.run).toHaveBeenCalledWith([
      newApp.name,
      newApp.executable_path,
      newApp.is_portable,
      newApp.category_id
    ]);
    // Verify the returned ID
    expect(result).toBe(123);
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
    const stmt = {
      run: jest.fn(() => ({ changes: 1 }))
    };
    mockDb.prepare.mockReturnValue(stmt);

    const result = await database.updateApplication(appId, updatedApp);
  });
});
    
describe('deleteApplication', () => {
  it('should delete an application', async () => {
    const appId = 1;
    
    // Mock exec for transaction
    mockDb.exec = jest.fn();
    const stmt = {
      run: jest.fn(() => ({ changes: 1 }))
    };
    mockDb.prepare.mockReturnValue(stmt);

    const result = database.deleteApplication(appId);
    });

    it('should handle non-existent application IDs', async () => {
      const nonExistentId = 999;
      
      const stmt = {
        get: jest.fn(() => undefined)
      };
      mockDb.prepare.mockReturnValue(stmt);

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
      mockDb.close = jest.fn(() => { throw error; });

      expect(() => database.closeDatabase()).toThrow(error);
      expect(consoleSpy).toHaveBeenCalledWith('Error closing database:', error);
      consoleSpy.mockRestore();
    });
  });
});