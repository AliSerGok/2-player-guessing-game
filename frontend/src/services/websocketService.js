import authService from './authService';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.roomId = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(roomId) {
    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
    const token = authService.getAccessToken();

    if (!token) {
      console.error('No access token available');
      return Promise.reject(new Error('Not authenticated'));
    }

    this.roomId = roomId;
    const wsUrl = `${WS_URL}/ws/game/${roomId}/?token=${token}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.trigger('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.trigger('error', { message: 'Connection error' });
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.trigger('disconnected', { code: event.code, reason: event.reason });

          // Attempt to reconnect if not closed intentionally
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
            setTimeout(() => this.connect(roomId), 2000);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  handleMessage(data) {
    switch (data.type) {
      case 'CONNECTION_SUCCESS':
        this.trigger('connectionSuccess', data);
        break;
      case 'GAME_STATE':
        this.trigger('gameState', data.game);
        break;
      case 'GAME_START':
        this.trigger('gameStart', data.game);
        break;
      case 'TURN_UPDATE':
        this.trigger('turnUpdate', { game: data.game, guess: data.guess });
        break;
      case 'GAME_END':
        this.trigger('gameEnd', { game: data.game, guess: data.guess });
        break;
      case 'ERROR':
        this.trigger('error', { message: data.error });
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not open');
      throw new Error('WebSocket is not connected');
    }
  }

  joinGame() {
    this.send({ type: 'JOIN_GAME' });
  }

  makeGuess(guessNumber) {
    this.send({
      type: 'MAKE_GUESS',
      guess_number: guessNumber,
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  trigger(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.listeners = {};
    this.roomId = null;
    this.reconnectAttempts = 0;
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();
