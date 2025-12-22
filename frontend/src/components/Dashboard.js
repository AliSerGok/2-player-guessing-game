import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import RoomList from './RoomList';
import CreateRoomModal from './CreateRoomModal';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRoomCreated = (room) => {
    setSuccessMessage(`Room #${room.id} created successfully!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleRoomJoined = (room) => {
    setSuccessMessage(`Joined room #${room.id} successfully!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="dashboard">
      <Header />

      <div className="dashboard-container">
        <div className="welcome-section">
          <h2>Welcome, {user?.email}!</h2>
          <p>Your current balance: <strong>{parseFloat(user?.balance || 0).toFixed(2)} Gold</strong></p>
          <button className="btn-create-room" onClick={() => setIsCreateModalOpen(true)}>
            Create New Room
          </button>
        </div>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}

        <div className="dashboard-content">
          <div className="info-card">
            <h3>How to Play</h3>
            <ul>
              <li>Create a room with a bet amount or join an existing room</li>
              <li>A secret number between 1-100 is generated</li>
              <li>Take turns guessing the number</li>
              <li>Get feedback: UP, DOWN, or CORRECT</li>
              <li>Winner takes 2x the bet amount!</li>
            </ul>
          </div>
        </div>

        <RoomList
          onRoomCreated={handleRoomCreated}
          onRoomJoined={handleRoomJoined}
        />
      </div>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
};

export default Dashboard;
