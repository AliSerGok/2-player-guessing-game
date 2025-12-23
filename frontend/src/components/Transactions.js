import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import api from '../services/api';
import './Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/wallet/transactions/');
      setTransactions(response.data);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit':
        return '💰';
      case 'withdraw':
        return '💸';
      case 'bet':
        return '🎲';
      case 'win':
        return '🏆';
      case 'refund':
        return '↩️';
      default:
        return '📝';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdraw';
      case 'bet':
        return 'Bet Placed';
      case 'win':
        return 'Win';
      case 'refund':
        return 'Refund';
      default:
        return type;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const getBalance = () => {
    let balance = 0;
    const sortedTx = [...transactions].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    sortedTx.forEach((tx) => {
      if (tx.type === 'deposit' || tx.type === 'win' || tx.type === 'refund') {
        balance += parseFloat(tx.amount);
      } else if (tx.type === 'withdraw' || tx.type === 'bet') {
        balance -= parseFloat(tx.amount);
      }
    });

    return balance;
  };

  const getStats = () => {
    const deposits = transactions
      .filter((tx) => tx.type === 'deposit')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const withdraws = transactions
      .filter((tx) => tx.type === 'withdraw')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const bets = transactions
      .filter((tx) => tx.type === 'bet')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const wins = transactions
      .filter((tx) => tx.type === 'win')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    return { deposits, withdraws, bets, wins };
  };

  const stats = getStats();

  return (
    <div className="transactions-page">
      <Header />

      <div className="transactions-container">
        <div className="transactions-header">
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1>Account Transactions</h1>
          <p>Your complete transaction history</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-deposit">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <p className="stat-label">Total Deposits</p>
              <p className="stat-value">{stats.deposits.toFixed(2)} Gold</p>
            </div>
          </div>

          <div className="stat-card stat-withdraw">
            <div className="stat-icon">💸</div>
            <div className="stat-content">
              <p className="stat-label">Total Withdraws</p>
              <p className="stat-value">{stats.withdraws.toFixed(2)} Gold</p>
            </div>
          </div>

          <div className="stat-card stat-bet">
            <div className="stat-icon">🎲</div>
            <div className="stat-content">
              <p className="stat-label">Total Bets</p>
              <p className="stat-value">{stats.bets.toFixed(2)} Gold</p>
            </div>
          </div>

          <div className="stat-card stat-win">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <p className="stat-label">Total Wins</p>
              <p className="stat-value">{stats.wins.toFixed(2)} Gold</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="transactions-filters">
          <button
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'deposit' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('deposit')}
          >
            Deposits
          </button>
          <button
            className={filter === 'withdraw' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('withdraw')}
          >
            Withdraws
          </button>
          <button
            className={filter === 'bet' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('bet')}
          >
            Bets
          </button>
          <button
            className={filter === 'win' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('win')}
          >
            Wins
          </button>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading transactions...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button onClick={loadTransactions} className="btn-retry">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="transactions-content">
            {filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="transactions-list">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className={`transaction-card tx-${tx.type}`}>
                    <div className="tx-icon">{getTypeIcon(tx.type)}</div>
                    <div className="tx-details">
                      <div className="tx-type">{getTypeLabel(tx.type)}</div>
                      <div className="tx-date">{formatDate(tx.created_at)}</div>
                    </div>
                    <div
                      className={`tx-amount ${
                        tx.type === 'withdraw' || tx.type === 'bet'
                          ? 'negative'
                          : 'positive'
                      }`}
                    >
                      {tx.type === 'withdraw' || tx.type === 'bet' ? '-' : '+'}
                      {parseFloat(tx.amount).toFixed(2)} Gold
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
