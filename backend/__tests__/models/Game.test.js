import mongoose from 'mongoose';
import Game from '../../models/Game.js';
import User from '../../models/userModel.js';

describe('Game Model', () => {
  let testUser;

  beforeAll(async () => {
    // התחברות למסד נתונים לבדיקות
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/guessify_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // ניקוי ונתק מהמסד נתונים
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // ניקוי המשחקים והמשתמשים לפני כל בדיקה
    await Game.deleteMany({});
    await User.deleteMany({});

    // יצירת משתמש לבדיקות
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123'
    });
    await testUser.save();
  });

  describe('Game Creation', () => {
    test('should create a new game with valid data', async () => {
      const gameData = {
        title: 'Test Game',
        description: 'A test game',
        createdBy: testUser._id,
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
        isPublic: true,
        guessTimeLimit: 30,
        guessInputMethod: 'freeText'
      };

      const game = new Game(gameData);
      const savedGame = await game.save();

      expect(savedGame._id).toBeDefined();
      expect(savedGame.title).toBe(gameData.title);
      expect(savedGame.description).toBe(gameData.description);
      expect(savedGame.createdBy.toString()).toBe(testUser._id.toString());
      expect(savedGame.songs).toHaveLength(1);
      expect(savedGame.isPublic).toBe(true);
      expect(savedGame.guessTimeLimit).toBe(30);
      expect(savedGame.guessInputMethod).toBe('freeText');
    });

    test('should require title', async () => {
      const gameData = {
        createdBy: testUser._id,
        songs: []
      };

      const game = new Game(gameData);
      
      await expect(game.save()).rejects.toThrow();
    });

    test('should require createdBy', async () => {
      const gameData = {
        title: 'Test Game',
        songs: []
      };

      const game = new Game(gameData);
      
      await expect(game.save()).rejects.toThrow();
    });

    test('should set default values correctly', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: []
      };

      const game = new Game(gameData);
      const savedGame = await game.save();

      expect(savedGame.isPublic).toBe(false); // Default value
      expect(savedGame.guessTimeLimit).toBe(15); // Default value
      expect(savedGame.guessInputMethod).toBe('freeText'); // Default value
    });
  });

  describe('Game Validation', () => {
    test('should validate guessTimeLimit enum values', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: [],
        guessTimeLimit: 25 // Invalid value
      };

      const game = new Game(gameData);
      
      await expect(game.save()).rejects.toThrow();
    });

    test('should accept valid guessTimeLimit values', async () => {
      const validTimeLimits = [15, 30, 45, 60];

      for (const timeLimit of validTimeLimits) {
        const gameData = {
          title: `Test Game ${timeLimit}`,
          createdBy: testUser._id,
          songs: [],
          guessTimeLimit: timeLimit
        };

        const game = new Game(gameData);
        const savedGame = await game.save();
        
        expect(savedGame.guessTimeLimit).toBe(timeLimit);
      }
    });

    test('should validate guessInputMethod enum values', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: [],
        guessInputMethod: 'invalidMethod'
      };

      const game = new Game(gameData);
      
      await expect(game.save()).rejects.toThrow();
    });

    test('should accept valid guessInputMethod values', async () => {
      const validMethods = ['freeText', 'letterClick'];

      for (const method of validMethods) {
        const gameData = {
          title: `Test Game ${method}`,
          createdBy: testUser._id,
          songs: [],
          guessInputMethod: method
        };

        const game = new Game(gameData);
        const savedGame = await game.save();
        
        expect(savedGame.guessInputMethod).toBe(method);
      }
    });
  });

  describe('Song Schema Validation', () => {
    test('should validate song structure', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: [
          {
            title: 'Test Song',
            artist: 'Test Artist',
            correctAnswer: 'Test Song',
            correctAnswers: ['Test Song', 'Alternative Title'],
            previewUrl: 'https://example.com/preview.mp3',
            artworkUrl: 'https://example.com/artwork.jpg',
            trackId: '12345'
          }
        ]
      };

      const game = new Game(gameData);
      const savedGame = await game.save();

      const song = savedGame.songs[0];
      expect(song.title).toBe('Test Song');
      expect(song.artist).toBe('Test Artist');
      expect(song.correctAnswer).toBe('Test Song');
      expect(song.correctAnswers).toEqual(['Test Song', 'Alternative Title']);
      expect(song.previewUrl).toBe('https://example.com/preview.mp3');
      expect(song.artworkUrl).toBe('https://example.com/artwork.jpg');
      expect(song.trackId).toBe('12345');
    });

    test('should require song title', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: [
          {
            artist: 'Test Artist',
            correctAnswer: 'Test Song'
          }
        ]
      };

      const game = new Game(gameData);
      
      await expect(game.save()).rejects.toThrow();
    });

    test('should require song correctAnswer', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: [
          {
            title: 'Test Song',
            artist: 'Test Artist'
          }
        ]
      };

      const game = new Game(gameData);
      
      await expect(game.save()).rejects.toThrow();
    });

    test('should set default values for song fields', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: [
          {
            title: 'Test Song',
            correctAnswer: 'Test Song'
          }
        ]
      };

      const game = new Game(gameData);
      const savedGame = await game.save();

      const song = savedGame.songs[0];
      expect(song.artist).toBe('Unknown Artist'); // Default value
      expect(song.previewUrl).toBe(''); // Default value
      expect(song.artworkUrl).toBe(''); // Default value
      expect(song.trackId).toBe(''); // Default value
    });
  });

  describe('Timestamps', () => {
    test('should automatically add createdAt and updatedAt timestamps', async () => {
      const gameData = {
        title: 'Test Game',
        createdBy: testUser._id,
        songs: []
      };

      const game = new Game(gameData);
      const savedGame = await game.save();

      expect(savedGame.createdAt).toBeDefined();
      expect(savedGame.updatedAt).toBeDefined();
      expect(savedGame.createdAt).toBeInstanceOf(Date);
      expect(savedGame.updatedAt).toBeInstanceOf(Date);
    });
  });
});
