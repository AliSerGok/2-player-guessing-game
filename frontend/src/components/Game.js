import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocketService';
import Header from './Header';
import './Game.css';

const Game = () => {
  const { roomId } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guessNumber, setGuessNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const connectAndJoin = async () => {
      try {
        await websocketService.connect(roomId);

        // Set up event listeners
        websocketService.on('connectionSuccess', (data) => {
          console.log('Connected to game room');
          websocketService.joinGame();
        });

        websocketService.on('gameState', (gameData) => {
          if (mounted) {
            setGame(gameData);
            setLoading(false);
          }
        });

        websocketService.on('gameStart', (gameData) => {
          if (mounted) {
            setGame(gameData);
            setLoading(false);
            setError('');
          }
        });

        websocketService.on('turnUpdate', ({ game: gameData, guess }) => {
          if (mounted) {
            setGame(gameData);
            setGuessNumber('');
            setSubmitting(false);
          }
        });

        websocketService.on('gameEnd', ({ game: gameData, guess }) => {
          if (mounted) {
            setGame(gameData);
            setSubmitting(false);
            refreshUser(); // Update balance
          }
        });

        websocketService.on('error', ({ message }) => {
          if (mounted) {
            setError(message);
            setSubmitting(false);
          }
        });

        websocketService.on('disconnected', () => {
          if (mounted) {
            setError('Disconnected from server');
          }
        });
      } catch (err) {
        console.error('Failed to connect:', err);
        if (mounted) {
          setError('Failed to connect to game');
          setLoading(false);
        }
      }
    };

    connectAndJoin();

    return () => {
      mounted = false;
      websocketService.disconnect();
    };
  }, [roomId, refreshUser]);

  const handleSubmitGuess = (e) => {
    e.preventDefault();

    const guess = parseInt(guessNumber);
    if (!guess || guess < 1 || guess > 100) {
      setError('Please enter a number between 1 and 100');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      websocketService.makeGuess(guess);
    } catch (err) {
      setError('Failed to submit guess');
      setSubmitting(false);
    }
  };

  const isMyTurn = game?.current_turn === user?.id;
  const isGameOver = game?.status === 'COMPLETED';
  const amIWinner = game?.winner === user?.id;

  const getFeedbackIcon = (feedback) => {
    switch (feedback) {
      case 'UP':
        return '⬆️';
      case 'DOWN':
        return '⬇️';
      case 'CORRECT':
        return '✅';
      default:
        return '';
    }
  };

  const getFeedbackText = (feedback) => {
    switch (feedback) {
      case 'UP':
        return 'Too low - Guess higher';
      case 'DOWN':
        return 'Too high - Guess lower';
      case 'CORRECT':
        return 'Correct! Winner!';
      default:
        return feedback;
    }
  };

  if (loading) {
    return (
      <div className="game-screen">
        <Header />
        <div className="game-loading">
          <div className="spinner"></div>
          <p>Connecting to game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-screen">
      <Header />

      <div className="game-container">
        {/* Game Header */}
        <div className="game-header">
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h2>Room #{roomId}</h2>
          <div className="game-status">
            {isGameOver ? (
              <span className="status-badge status-completed">Game Over</span>
            ) : (
              <span className="status-badge status-active">In Progress</span>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Game Info */}
        <div className="game-info-section">
          <div className="game-info-card">
            <h3>Game Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Bet Amount:</span>
                <span className="info-value">{parseFloat(game?.bet_amount || 0).toFixed(2)} Gold</span>
              </div>
              <div className="info-item">
                <span className="info-label">Player 1:</span>
                <span className="info-value">{game?.player1_email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Player 2:</span>
                <span className="info-value">{game?.player2_email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Current Turn:</span>
                <span className="info-value">
                  {game?.current_turn_email}
                  {isMyTurn && <span className="your-turn-badge"> (Your Turn)</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Result */}
        {isGameOver && (
          <div className={`game-result ${amIWinner ? 'winner' : 'loser'}`}>
            <h3>{amIWinner ? '🎉 You Won!' : '😔 You Lost'}</h3>
            <p>Winner: {game?.winner_email}</p>
            <p>Prize: {parseFloat(game?.bet_amount * 2 || 0).toFixed(2)} Gold</p>
          </div>
        )}

        {/* Guess Input */}
        {!isGameOver && (
          <div className="guess-section">
            <form onSubmit={handleSubmitGuess}>
              <div className="guess-input-group">
                <input
                  type="number"
                  value={guessNumber}
                  onChange={(e) => setGuessNumber(e.target.value)}
                  placeholder="Enter your guess (1-100)"
                  min="1"
                  max="100"
                  disabled={!isMyTurn || submitting}
                  className="guess-input"
                />
                <button
                  type="submit"
                  disabled={!isMyTurn || submitting || !guessNumber}
                  className="btn-guess"
                >
                  {submitting ? 'Submitting...' : isMyTurn ? 'Submit Guess' : 'Wait for your turn'}
                </button>
              </div>
            </form>
            {!isMyTurn && !submitting && (
              <p className="turn-info">Waiting for {game?.current_turn_email} to make a guess...</p>
            )}
          </div>
        )}

        {/* Guess History */}
        <div className="guess-history-section">
          <h3>Guess History</h3>
          {game?.guesses && game.guesses.length > 0 ? (
            <div className="guess-history">
              {game.guesses.map((guess, index) => (
                <div key={guess.id || index} className="guess-item">
                  <div className="guess-player">{guess.player_email}</div>
                  <div className="guess-number">{guess.guess_number}</div>
                  <div className={`guess-feedback feedback-${guess.feedback.toLowerCase()}`}>
                    {getFeedbackIcon(guess.feedback)} {getFeedbackText(guess.feedback)}
                  </div>
                  <div className="guess-time">
                    {new Date(guess.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-guesses">No guesses yet. Be the first to guess!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;
