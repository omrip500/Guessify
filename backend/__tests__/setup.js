// Setup file for Jest tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables if not provided
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.MONGO_URI_TEST = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/guessify_test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console.log for cleaner test output (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep error logs for debugging
};

// Global test utilities
global.testUtils = {
  // Helper function to create test user data
  createTestUserData: (overrides = {}) => ({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'password123',
    ...overrides
  }),

  // Helper function to create test game data
  createTestGameData: (userId, overrides = {}) => ({
    title: 'Test Game',
    description: 'A test game',
    createdBy: userId,
    songs: [
      {
        title: 'Test Song',
        artist: 'Test Artist',
        correctAnswer: 'Test Song',
        correctAnswers: ['Test Song'],
        previewUrl: 'https://example.com/preview.mp3',
        artworkUrl: 'https://example.com/artwork.jpg'
      }
    ],
    isPublic: false,
    guessTimeLimit: 15,
    guessInputMethod: 'freeText',
    ...overrides
  }),

  // Helper function to create test song data
  createTestSongData: (overrides = {}) => ({
    title: 'Test Song',
    artist: 'Test Artist',
    correctAnswer: 'Test Song',
    correctAnswers: ['Test Song'],
    previewUrl: 'https://example.com/preview.mp3',
    artworkUrl: 'https://example.com/artwork.jpg',
    trackId: '12345',
    ...overrides
  }),

  // Helper function to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper function to generate random string
  randomString: (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Helper function to generate random email
  randomEmail: () => {
    const randomStr = global.testUtils.randomString(8);
    return `test${randomStr}@example.com`;
  }
};
