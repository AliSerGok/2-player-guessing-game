import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="header-title">Betting Guessing Game</h1>
        </div>

        <div className="header-right">
          {user && (
            <>
              <div className="user-info">
                <span className="user-email">{user.email}</span>
                <span className="user-balance">
                  Balance: <strong>{parseFloat(user.balance).toFixed(2)} Gold</strong>
                </span>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
