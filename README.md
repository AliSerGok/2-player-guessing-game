# 2-Player Betting Guessing Game

A real-time multiplayer betting guessing game.

## Tech Stack

- **Backend**: Django + Django REST Framework + Django Channels
- **Frontend**: React
- **Database**: PostgreSQL
- **Real-time**: WebSocket (Redis)

## Project Structure

```
.
├── backend/          # Django backend
└── frontend/         # React frontend
```

## Database

This app uses **PostgreSQL** as the main database.

**Why PostgreSQL?**
- **Transactional Integrity**: ACID compliance ensures betting transactions are safe
- **Concurrent Writes**: Multiple users can place bets simultaneously without conflicts
- **Balance Safety**: Row-level locking prevents race conditions in wallet operations
- **Production Ready**: Scales well for real-world betting applications

**Redis** is used ONLY for WebSocket message brokering (Django Channels), NOT as a database.

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis

### Database Setup

1. Install PostgreSQL and create database:
```bash
# Mac (via Homebrew)
brew install postgresql
brew services start postgresql

# Windows - Download from: https://www.postgresql.org/download/windows/

# Linux
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Create database
psql -U postgres
CREATE DATABASE betting_game_db;
\q
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy .env.example to .env and configure database credentials
cp .env.example .env
# Edit .env with your PostgreSQL password

python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
