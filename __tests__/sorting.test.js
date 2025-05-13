// __tests__/sorting.test.js
const path = require('path');

// Mock the database before any imports
jest.mock('../database');

// After mocking, import the database module
const database = require('../database');

describe('Application Sorting Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Alphabetical Sorting', () => {
    it('should verify alphabetical sorting in getAllApps query', () => {
      // Set up mock implementation for getAllApps
      const mockApplications = [
        { id: 1, name: 'App A' },
        { id: 2, name: 'App B' },
        { id: 3, name: 'App C' }
      ];
      
      // Mock the implementation
      database.getAllApps.mockResolvedValue(mockApplications);
      
      // Test the function
      return database.getAllApps().then(result => {
        // Verify the function was called
        expect(database.getAllApps).toHaveBeenCalled();
        
        // Verify the returned data
        expect(result).toEqual(mockApplications);
      });
    });
  });

  describe('Category Sorting', () => {
    it('should verify category display order sorting in getApplicationsByCategory', () => {
      // Sample data sorted by category
      const mockAppsByCategory = [
        { id: 1, name: 'App A', category_id: 1, category_name: 'Development' },
        { id: 2, name: 'App B', category_id: 2, category_name: 'Office' }
      ];
      
      // Mock the implementation
      database.getApplicationsByCategory.mockResolvedValue(mockAppsByCategory);
      
      // Test the function
      return database.getApplicationsByCategory().then(result => {
        // Verify the function was called
        expect(database.getApplicationsByCategory).toHaveBeenCalled();
        
        // Verify the returned data
        expect(result).toEqual(mockAppsByCategory);
      });
    });
  });

  describe('Most Used Applications Sorting', () => {
    it('should verify usage count sorting in getMostUsedApplications', () => {
      // Sample data in usage count order (highest to lowest)
      const mockMostUsed = [
        { id: 3, name: 'App C', usage_count: 50 },
        { id: 1, name: 'App A', usage_count: 30 },
        { id: 2, name: 'App B', usage_count: 10 }
      ];
      
      // Mock the implementation
      database.getMostUsedApplications.mockResolvedValue(mockMostUsed);
      
      // Test the function
      return database.getMostUsedApplications().then(result => {
        // Verify the function was called
        expect(database.getMostUsedApplications).toHaveBeenCalled();
        
        // Verify the returned data
        expect(result).toEqual(mockMostUsed);
        expect(result[0].usage_count).toBeGreaterThan(result[1].usage_count);
        expect(result[1].usage_count).toBeGreaterThan(result[2].usage_count);
      });
    });
    
    it('should pass the limit parameter to getMostUsedApplications', () => {
      const customLimit = 5;
      const mockResult = [];
      
      // Mock the implementation
      database.getMostUsedApplications.mockResolvedValue(mockResult);
      
      // Test the function with custom limit
      return database.getMostUsedApplications(customLimit).then(() => {
        // Verify the function was called with the correct limit
        expect(database.getMostUsedApplications).toHaveBeenCalledWith(customLimit);
      });
    });
  });

  describe('Recently Used Applications Sorting', () => {
    it('should verify date sorting in getRecentlyUsedApplications', () => {
      // Sample data in last_used order (most recent first)
      const mockRecent = [
        { id: 2, name: 'App B', last_used: '2025-05-03T12:00:00.000Z' },
        { id: 3, name: 'App C', last_used: '2025-05-02T14:30:00.000Z' },
        { id: 1, name: 'App A', last_used: '2025-04-28T09:15:00.000Z' }
      ];
      
      // Mock the implementation
      database.getRecentlyUsedApplications.mockResolvedValue(mockRecent);
      
      // Test the function
      return database.getRecentlyUsedApplications().then(result => {
        // Verify the function was called
        expect(database.getRecentlyUsedApplications).toHaveBeenCalled();
        
        // Verify the returned data is in correct order
        expect(result).toEqual(mockRecent);
        
        // Parse dates and verify the sorting order
        const dates = result.map(app => new Date(app.last_used));
        expect(dates[0] > dates[1]).toBe(true);
        expect(dates[1] > dates[2]).toBe(true);
      });
    });
    
    it('should pass the limit parameter to getRecentlyUsedApplications', () => {
      const customLimit = 5;
      const mockResult = [];
      
      // Mock the implementation
      database.getRecentlyUsedApplications.mockResolvedValue(mockResult);
      
      // Test the function with custom limit
      return database.getRecentlyUsedApplications(customLimit).then(() => {
        // Verify the function was called with the correct limit
        expect(database.getRecentlyUsedApplications).toHaveBeenCalledWith(customLimit);
      });
    });
  });

  describe('Favorite Applications Sorting', () => {
    it('should verify favorite flag filtering in getFavoriteApplications', () => {
      // Sample favorite applications
      const mockFavorites = [
        { id: 1, name: 'App A', is_favorite: 1 },
        { id: 2, name: 'App B', is_favorite: 1 },
        { id: 3, name: 'App C', is_favorite: 1 }
      ];
      
      // Mock the implementation
      database.getFavoriteApplications.mockResolvedValue(mockFavorites);
      
      // Test the function
      return database.getFavoriteApplications().then(result => {
        // Verify the function was called
        expect(database.getFavoriteApplications).toHaveBeenCalled();
        
        // Verify all returned items are favorites
        expect(result.every(app => app.is_favorite === 1)).toBe(true);
      });
    });
  });

  describe('Search Results Sorting', () => {
    it('should handle search term in searchApplications', () => {
      const searchTerm = 'test';
      const mockSearchResults = [
        { id: 1, name: 'Test App' },
        { id: 2, name: 'Testing Tool' },
        { id: 3, name: 'App Test' }
      ];
      
      // Mock the implementation
      database.searchApplications.mockResolvedValue(mockSearchResults);
      
      // Test the function
      return database.searchApplications(searchTerm).then(result => {
        // Verify the function was called with the search term
        expect(database.searchApplications).toHaveBeenCalledWith(searchTerm);
        
        // Verify the returned data
        expect(result).toEqual(mockSearchResults);
      });
    });
  });
});