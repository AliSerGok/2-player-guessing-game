import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import adminService from '../services/adminService';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Users
  const [users, setUsers] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('');

  // Rooms
  const [rooms, setRooms] = useState([]);
  const [roomStatusFilter, setRoomStatusFilter] = useState('');

  // Games
  const [games, setGames] = useState([]);
  const [gameStatusFilter, setGameStatusFilter] = useState('');

  // Bet Settings
  const [betSettings, setBetSettings] = useState(null);
  const [betSettingsForm, setBetSettingsForm] = useState({
    min_bet: '',
    max_bet: '',
    step: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load data based on active tab
  useEffect(() => {
    loadTabData();
  }, [activeTab, searchEmail, roleFilter, transactionTypeFilter, roomStatusFilter, gameStatusFilter]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const params = {};
        if (searchEmail) params.search = searchEmail;
        if (roleFilter) params.role = roleFilter;
        const data = await adminService.getUsers(params);
        setUsers(data);
      } else if (activeTab === 'transactions') {
        const params = {};
        if (transactionTypeFilter) params.type = transactionTypeFilter;
        const data = await adminService.getTransactions(params);
        setTransactions(data);
      } else if (activeTab === 'rooms') {
        const params = {};
        if (roomStatusFilter) params.status = roomStatusFilter;
        const data = await adminService.getRooms(params);
        setRooms(data);
      } else if (activeTab === 'games') {
        const params = {};
        if (gameStatusFilter) params.status = gameStatusFilter;
        const data = await adminService.getGames(params);
        setGames(data);
      } else if (activeTab === 'bet-settings') {
        const data = await adminService.getBetSettings();
        setBetSettings(data);
        setBetSettingsForm({
          min_bet: data.min_bet,
          max_bet: data.max_bet,
          step: data.step
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdateBetSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await adminService.updateBetSettings(betSettingsForm);
      setMessage(response.message || 'Bet settings updated successfully');
      setBetSettings(response.settings);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Error updating bet settings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-user-info">
          <span>{user.email}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === 'users' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={activeTab === 'transactions' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button
          className={activeTab === 'rooms' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('rooms')}
        >
          Rooms
        </button>
        <button
          className={activeTab === 'games' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('games')}
        >
          Games
        </button>
        <button
          className={activeTab === 'bet-settings' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('bet-settings')}
        >
          Bet Settings
        </button>
      </div>

      <div className="admin-content">
        {message && <div className="message">{message}</div>}

        {loading && <div className="loading">Loading...</div>}

        {/* Users Tab */}
        {activeTab === 'users' && !loading && (
          <div className="tab-content">
            <div className="filters">
              <input
                type="text"
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="filter-input"
              />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="filter-select">
                <option value="">All Roles</option>
                <option value="player">Player</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Age</th>
                  <th>Balance</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td><span className={`badge badge-${user.role}`}>{user.role}</span></td>
                    <td>{user.age}</td>
                    <td>{user.balance} Gold</td>
                    <td>{formatDate(user.date_joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && !loading && (
          <div className="tab-content">
            <div className="filters">
              <select value={transactionTypeFilter} onChange={(e) => setTransactionTypeFilter(e.target.value)} className="filter-select">
                <option value="">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdraw">Withdraw</option>
                <option value="bet">Bet</option>
                <option value="win">Win</option>
                <option value="refund">Refund</option>
              </select>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{tx.user_email}</td>
                    <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                    <td>{tx.amount} Gold</td>
                    <td>{formatDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && !loading && (
          <div className="tab-content">
            <div className="filters">
              <select value={roomStatusFilter} onChange={(e) => setRoomStatusFilter(e.target.value)} className="filter-select">
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="FULL">Full</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Bet Amount</th>
                  <th>Status</th>
                  <th>Creator</th>
                  <th>Player 1</th>
                  <th>Player 2</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id}>
                    <td>{room.id}</td>
                    <td>{room.bet_amount} Gold</td>
                    <td><span className={`badge badge-${room.status.toLowerCase()}`}>{room.status}</span></td>
                    <td>{room.creator_email}</td>
                    <td>{room.player1_email || '-'}</td>
                    <td>{room.player2_email || '-'}</td>
                    <td>{formatDate(room.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && !loading && (
          <div className="tab-content">
            <div className="filters">
              <select value={gameStatusFilter} onChange={(e) => setGameStatusFilter(e.target.value)} className="filter-select">
                <option value="">All Statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th>Player 1</th>
                  <th>Player 2</th>
                  <th>Winner</th>
                  <th>Bet Amount</th>
                  <th>Guesses</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr key={game.id}>
                    <td>{game.id}</td>
                    <td>#{game.room_id}</td>
                    <td><span className={`badge badge-${game.status.toLowerCase().replace('_', '-')}`}>{game.status}</span></td>
                    <td>{game.player1_email}</td>
                    <td>{game.player2_email}</td>
                    <td>{game.winner_email || '-'}</td>
                    <td>{game.bet_amount} Gold</td>
                    <td>{game.guesses?.length || 0}</td>
                    <td>{formatDate(game.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bet Settings Tab */}
        {activeTab === 'bet-settings' && !loading && betSettings && (
          <div className="tab-content">
            <div className="bet-settings-form">
              <h2>Bet Settings Configuration</h2>
              <form onSubmit={handleUpdateBetSettings}>
                <div className="form-group">
                  <label>Minimum Bet (Gold)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={betSettingsForm.min_bet}
                    onChange={(e) => setBetSettingsForm({...betSettingsForm, min_bet: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Maximum Bet (Gold)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={betSettingsForm.max_bet}
                    onChange={(e) => setBetSettingsForm({...betSettingsForm, max_bet: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Step Increment (Gold)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={betSettingsForm.step}
                    onChange={(e) => setBetSettingsForm({...betSettingsForm, step: e.target.value})}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  Update Settings
                </button>
              </form>

              <div className="current-settings">
                <h3>Current Settings</h3>
                <p><strong>Minimum Bet:</strong> {betSettings.min_bet} Gold</p>
                <p><strong>Maximum Bet:</strong> {betSettings.max_bet} Gold</p>
                <p><strong>Step:</strong> {betSettings.step} Gold</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
