import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import mongoose from 'mongoose';
import Game from '../../models/Game.js';
import User from '../../models/userModel.js';
import socketManager from '../../sockets/index.js';
import rooms from '../../sockets/roomStore.js';

describe('Game Events Socket.IO', () => {
  let httpServer;
  let io;
  let clientSocket;
  let testUser;
  let testGame;

  beforeAll(async () => {
    // התחברות למסד נתונים לבדיקות
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/guessify_test';
    await mongoose.connect(mongoUri);

    // יצירת שרת HTTP ו-Socket.IO
    httpServer = createServer();
    io = new Server(httpServer);
    socketManager(io);

    // הפעלת השרת
    await new Promise((resolve) => {
      httpServer.listen(() => {
        const port = httpServer.address().port;
        resolve(port);
      });
    });
  });

  afterAll(async () => {
    // ניקוי ונתק
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
    io.close();
    httpServer.close();
  });

  beforeEach(async () => {
    // ניקוי המסד נתונים לפני כל בדיקה
    await Game.deleteMany({});
    await User.deleteMany({});
    rooms.clear();

    // יצירת משתמש ומשחק לבדיקות
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123'
    });
    await testUser.save();

    testGame = new Game({
      title: 'Test Game',
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
      guessTimeLimit: 15
    });
    await testGame.save();

    // יצירת לקוח Socket.IO
    const port = httpServer.address().port;
    clientSocket = new Client(`http://localhost:${port}`);

    // המתנה לחיבור
    await new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Room Management', () => {
    test('should create room when organizer joins', (done) => {
      const roomCode = '12345';
      const organizerData = {
        roomCode,
        gameId: testGame._id.toString(),
        organizerName: 'Test Organizer'
      };

      clientSocket.on('roomCreated', (data) => {
        expect(data.roomCode).toBe(roomCode);
        expect(data.game).toBeDefined();
        expect(data.game.title).toBe('Test Game');
        expect(rooms.has(roomCode)).toBe(true);
        done();
      });

      clientSocket.emit('createRoom', organizerData);
    });

    test('should allow player to join existing room', (done) => {
      const roomCode = '12345';
      
      // יצירת חדר קודם
      const organizerData = {
        roomCode,
        gameId: testGame._id.toString(),
        organizerName: 'Test Organizer'
      };

      clientSocket.emit('createRoom', organizerData);

      clientSocket.on('roomCreated', () => {
        // עכשיו נצרף כשחקן
        const playerData = {
          roomCode,
          playerName: 'Test Player'
        };

        clientSocket.on('playerJoined', (data) => {
          expect(data.playerName).toBe('Test Player');
          expect(data.players).toHaveLength(1);
          done();
        });

        clientSocket.emit('joinRoom', playerData);
      });
    });

    test('should reject joining non-existent room', (done) => {
      const playerData = {
        roomCode: '99999',
        playerName: 'Test Player'
      };

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('Room not found');
        done();
      });

      clientSocket.emit('joinRoom', playerData);
    });
  });

  describe('Game Flow', () => {
    let roomCode;

    beforeEach((done) => {
      roomCode = '12345';
      const organizerData = {
        roomCode,
        gameId: testGame._id.toString(),
        organizerName: 'Test Organizer'
      };

      clientSocket.on('roomCreated', () => {
        // הוספת שחקן
        const playerData = {
          roomCode,
          playerName: 'Test Player'
        };

        clientSocket.on('playerJoined', () => {
          done();
        });

        clientSocket.emit('joinRoom', playerData);
      });

      clientSocket.emit('createRoom', organizerData);
    });

    test('should start game when organizer initiates', (done) => {
      clientSocket.on('gameStarting', () => {
        expect(true).toBe(true); // Game starting event received
        done();
      });

      clientSocket.emit('startGame', { roomCode });
    });

    test('should handle round progression', (done) => {
      let roundStarted = false;

      clientSocket.on('gameStarting', () => {
        // המשחק מתחיל
      });

      clientSocket.on('roundStart', (data) => {
        expect(data.roundNumber).toBe(1);
        expect(data.song).toBeDefined();
        expect(data.audioSnippetDuration).toBe(1000); // 1 second for first round
        roundStarted = true;
      });

      clientSocket.on('roundEnd', (data) => {
        if (roundStarted) {
          expect(data.roundNumber).toBe(1);
          expect(data.correctAnswer).toBe('Test Song');
          done();
        }
      });

      clientSocket.emit('startGame', { roomCode });
    });

    test('should handle player answers', (done) => {
      clientSocket.on('roundStart', () => {
        // שליחת תשובה
        clientSocket.emit('submitAnswer', {
          roomCode,
          answer: 'Test Song',
          timeTaken: 5000
        });
      });

      clientSocket.on('answerSubmitted', (data) => {
        expect(data.playerName).toBe('Test Player');
        expect(data.isCorrect).toBe(true);
        expect(data.score).toBeGreaterThan(0);
        done();
      });

      clientSocket.emit('startGame', { roomCode });
    });

    test('should handle incorrect answers', (done) => {
      clientSocket.on('roundStart', () => {
        // שליחת תשובה שגויה
        clientSocket.emit('submitAnswer', {
          roomCode,
          answer: 'Wrong Answer',
          timeTaken: 5000
        });
      });

      clientSocket.on('answerSubmitted', (data) => {
        expect(data.playerName).toBe('Test Player');
        expect(data.isCorrect).toBe(false);
        expect(data.score).toBe(0);
        done();
      });

      clientSocket.emit('startGame', { roomCode });
    });
  });

  describe('Player Disconnection', () => {
    let roomCode;

    beforeEach((done) => {
      roomCode = '12345';
      const organizerData = {
        roomCode,
        gameId: testGame._id.toString(),
        organizerName: 'Test Organizer'
      };

      clientSocket.on('roomCreated', () => {
        const playerData = {
          roomCode,
          playerName: 'Test Player'
        };

        clientSocket.on('playerJoined', () => {
          done();
        });

        clientSocket.emit('joinRoom', playerData);
      });

      clientSocket.emit('createRoom', organizerData);
    });

    test('should handle player disconnection during game', (done) => {
      clientSocket.on('gameStarting', () => {
        // ניתוק השחקן במהלך המשחק
        clientSocket.disconnect();
      });

      clientSocket.on('playerDisconnected', (data) => {
        expect(data.playerName).toBe('Test Player');
        expect(data.disconnectedPlayers).toContain('Test Player');
        done();
      });

      clientSocket.emit('startGame', { roomCode });
    });

    test('should pause game when player disconnects', (done) => {
      clientSocket.on('roundStart', () => {
        // ניתוק במהלך הסיבוב
        clientSocket.disconnect();
      });

      clientSocket.on('gamePaused', (data) => {
        expect(data.reason).toBe('player_disconnected');
        expect(data.disconnectedPlayers).toContain('Test Player');
        done();
      });

      clientSocket.emit('startGame', { roomCode });
    });
  });

  describe('Game Completion', () => {
    let roomCode;

    beforeEach((done) => {
      roomCode = '12345';
      
      // יצירת משחק עם שיר אחד בלבד לבדיקה מהירה
      const organizerData = {
        roomCode,
        gameId: testGame._id.toString(),
        organizerName: 'Test Organizer'
      };

      clientSocket.on('roomCreated', () => {
        const playerData = {
          roomCode,
          playerName: 'Test Player'
        };

        clientSocket.on('playerJoined', () => {
          done();
        });

        clientSocket.emit('joinRoom', playerData);
      });

      clientSocket.emit('createRoom', organizerData);
    });

    test('should end game after all songs', (done) => {
      let roundsCompleted = 0;

      clientSocket.on('roundStart', () => {
        // שליחת תשובה מהירה
        clientSocket.emit('submitAnswer', {
          roomCode,
          answer: 'Test Song',
          timeTaken: 2000
        });
      });

      clientSocket.on('roundEnd', () => {
        roundsCompleted++;
      });

      clientSocket.on('gameEnd', (data) => {
        expect(data.finalScores).toBeDefined();
        expect(data.winner).toBeDefined();
        expect(roundsCompleted).toBe(1); // One song = one round
        done();
      });

      clientSocket.emit('startGame', { roomCode });
    });
  });
});
