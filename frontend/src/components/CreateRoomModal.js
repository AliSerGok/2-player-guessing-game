import React, { useState } from 'react';
import roomService from '../services/roomService';
import { useAuth } from '../contexts/AuthContext';
import './CreateRoomModal.css';

const CreateRoomModal = ({ isOpen, onClose, onRoomCreated }) => {
  const [betAmount, setBetAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(betAmount);

    if (!amount || amount <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    if (amount > user.balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      const response = await roomService.createRoom(amount);
      await refreshUser(); // Update user balance
      if (onRoomCreated) {
        onRoomCreated(response.room);
      }
      setBetAmount('');
      onClose();
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.error) {
        setError(errorData.error);
      } else if (errorData?.bet_amount) {
        setError(errorData.bet_amount[0]);
      } else {
        setError('Failed to create room. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setBetAmount('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Room</h3>
          <button className="modal-close" onClick={handleClose} disabled={loading}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="betAmount">Bet Amount (Gold)</label>
            <input
              type="number"
              id="betAmount"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter bet amount in Gold"
              step="0.01"
              min="0.01"
              required
              disabled={loading}
            />
            <small className="form-help">
              Your balance: {parseFloat(user?.balance || 0).toFixed(2)} Gold
            </small>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
