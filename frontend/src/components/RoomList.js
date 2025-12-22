import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import roomService from '../services/roomService';
import { useAuth } from '../contexts/AuthContext';
import './RoomList.css';

const RoomList = ({ onRoomCreated, onRoomJoined }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(null);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await roomService.getRooms();
      setRooms(data);
      setError('');
    } catch (err) {
      setError('Failed to load rooms');
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // Refresh rooms every 5 seconds
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinRoom = async (roomId, betAmount) => {
    if (joiningRoom) return;

    // Check balance (convert betAmount to number for proper comparison)
    const betAmountNum = parseFloat(betAmount);
    if (user.balance < betAmountNum) {
      setError('Insufficient balance to join this room');
      return;
    }

    setJoiningRoom(roomId);
    setError('');

    try {
      const response = await roomService.joinRoom(roomId);
      await refreshUser(); // Update user balance
      if (onRoomJoined) {
        onRoomJoined(response.room);
      }
      // Navigate to game when room becomes FULL
      if (response.room.status === 'FULL') {
        navigate(`/game/${roomId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join room');
      setJoiningRoom(null);
    }
  };

  const handleViewGame = (roomId) => {
    navigate(`/game/${roomId}`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      OPEN: <span className="badge badge-open">Open</span>,
      FULL: <span className="badge badge-full">Full</span>,
      COMPLETED: <span className="badge badge-completed">Completed</span>,
    };
    return badges[status] || status;
  };

  if (loading && rooms.length === 0) {
    return <div className="room-list-loading">Loading rooms...</div>;
  }

  return (
    <div className="room-list">
      <div className="room-list-header">
        <h3>Available Rooms</h3>
        <button onClick={fetchRooms} className="btn-refresh" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {rooms.length === 0 ? (
        <div className="no-rooms">
          <p>No rooms available. Create one to get started!</p>
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-header">
                <span className="room-id">Room #{room.id}</span>
                {getStatusBadge(room.status)}
              </div>

              <div className="room-card-body">
                <div className="room-info">
                  <div className="room-info-item">
                    <span className="label">Bet Amount:</span>
                    <span className="value">{parseFloat(room.bet_amount).toFixed(2)} Gold</span>
                  </div>
                  <div className="room-info-item">
                    <span className="label">Players:</span>
                    <span className="value">{room.players_count}/2</span>
                  </div>
                  <div className="room-info-item">
                    <span className="label">Creator:</span>
                    <span className="value">{room.creator_email}</span>
                  </div>
                </div>

                {room.status === 'OPEN' && (
                  <button
                    onClick={() => handleJoinRoom(room.id, room.bet_amount)}
                    disabled={joiningRoom === room.id || room.creator === user.id}
                    className="btn-join"
                  >
                    {joiningRoom === room.id
                      ? 'Joining...'
                      : room.creator === user.id
                      ? 'Your Room'
                      : 'Join Room'}
                  </button>
                )}

                {room.status === 'FULL' && (
                  <button
                    onClick={() => handleViewGame(room.id)}
                    className="btn-view-game"
                  >
                    View Game
                  </button>
                )}

                {room.status === 'COMPLETED' && (
                  <button
                    onClick={() => handleViewGame(room.id)}
                    className="btn-view-game"
                  >
                    View Results
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
