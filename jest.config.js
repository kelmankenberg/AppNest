module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  setupFiles: ['./jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'database.js',
    'functions.js',
    'settings.js',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageReporters: ['text', 'lcov'],
  verbose: true
};