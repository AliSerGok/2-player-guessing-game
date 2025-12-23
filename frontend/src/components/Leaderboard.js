import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import api from '../services/api';
import './Leaderboard.css';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/game/leaderboard/');
      setLeaderboard(response.data);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getWinRate = (wins, totalGames) => {
    if (totalGames === 0) return '0%';
    return ((wins / totalGames) * 100).toFixed(1) + '%';
  };

  return (
    <div className="leaderboard-page">
      <Header />

      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1>Leaderboard</h1>
          <p>Top players ranked by wins and balance</p>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button onClick={loadLeaderboard} className="btn-retry">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="leaderboard-content">
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <p>No players yet. Be the first to play!</p>
              </div>
            ) : (
              <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Wins</th>
                      <th>Total Games</th>
                      <th>Win Rate</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player) => (
                      <tr
                        key={player.id}
                        className={`rank-${player.rank <= 3 ? player.rank : 'other'}`}
                      >
                        <td className="rank-cell">
                          <span className="rank-display">
                            {getMedalIcon(player.rank)}
                          </span>
                        </td>
                        <td className="player-cell">
                          <span className="player-email">{player.email}</span>
                        </td>
                        <td className="wins-cell">
                          <span className="wins-count">{player.wins}</span>
                        </td>
                        <td className="games-cell">{player.total_games}</td>
                        <td className="winrate-cell">
                          <span className="winrate-badge">
                            {getWinRate(player.wins, player.total_games)}
                          </span>
                        </td>
                        <td className="balance-cell">
                          <span className="balance-amount">
                            {player.balance.toFixed(2)} Gold
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
