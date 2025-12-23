# 2-Player Betting Guessing Game

A real-time, two-player number guessing game platform built with React and Django.

## Live Demo

**Production Links:**
- **Frontend**: https://splendid-youth-production-f3f7.up.railway.app
- **Backend API**: https://2-player-guessing-game-production.up.railway.app

**Test Accounts:**

**Regular User (Player):**
- Create a new account at `/signup`
- Automatically receives 1000 Gold starting balance

**Admin Panel:**
- **URL**: https://splendid-youth-production-f3f7.up.railway.app/admin
- **Email**: `admin@gmail.com`
- **Password**: `adminadmin`
- **Permissions**: View and manage all users, games, and transactions

## Installation

### Requirements
- Python 3.11+
- Node.js 20+
- PostgreSQL 12+
- Redis 6+

### Backend Setup

```bash
# Create PostgreSQL database
createdb betting_game_db

# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://postgres:password@localhost:5432/betting_game_db
REDIS_URL=redis://localhost:6379
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
EOF

# Run database migrations
python manage.py migrate

# Create admin user (automatic)
python manage.py create_admin
# Email: admin@gmail.com
# Password: adminadmin

# Start Redis (new terminal window)
redis-server

# Start Django server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
EOF

# Start development server
npm start
```

### Access

**Local Development:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:3000/admin

**Admin Login:**
- **Email**: `admin@gmail.com`
- **Password**: `adminadmin`

**Note**: Admin user is automatically created by running `python manage.py create_admin`.

## Architecture

### Overall Architecture

The project uses a **client-server** architecture with completely separated frontend and backend:

```
┌─────────────┐         HTTP/REST          ┌─────────────┐
│   React     │ ◄────────────────────────► │   Django    │
│  Frontend   │                             │   Backend   │
│             │         WebSocket           │             │
│             │ ◄────────────────────────► │  Channels   │
└─────────────┘                             └──────┬──────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │                             │
                              ┌─────▼─────┐              ┌────────▼────────┐
                              │PostgreSQL │              │      Redis      │
                              │ Database  │              │ Channel Layer   │
                              └───────────┘              └─────────────────┘
```

### Backend (Django)

**Modular Structure:**
- `apps/users/`: User management, authentication, wallet, and transaction operations
- `apps/game/`: Game logic, room management, betting system, WebSocket consumers

**Layered Architecture:**
- **Models** (`models.py`): Database schema and ORM models
- **Serializers** (`serializers.py`): API input/output validation and serialization
- **Views** (`views.py`): REST API endpoints (DRF ViewSets)
- **Services** (`services.py`): Business logic and game rules
- **Consumers** (`consumers.py`): WebSocket event handling

**Technology Choices:**
- **Django Channels**: ASGI application for WebSocket support
- **Redis**: Channel layer for WebSocket message broadcasting
- **PostgreSQL**: ACID transaction support, row-level locking
- **JWT**: Stateless authentication (for REST API and WebSocket)

### Frontend (React)

**Component-Based Structure:**
- `components/`: Reusable UI components
- `contexts/`: Global state management (AuthContext)
- `services/`: API and WebSocket communication layer

**State Management:**
- **Context API**: Global authentication state
- **Local State**: Component-level state (useState/useEffect hooks)
- **WebSocket Service**: Singleton pattern for WebSocket connection management

### Real-Time Communication

**WebSocket Architecture:**
- ASGI-based WebSocket server with Django Channels
- Message broadcasting via Redis channel layer (pub/sub pattern)
- JWT authentication via query parameter in WebSocket connection
- Event-driven architecture: Frontend uses event listener pattern

**Game Flow:**
```
Player1 & Player2 → WebSocket Connect → JWT Auth
                         ↓
                    JOIN_GAME event
                         ↓
              GameService.start_game()
                         ↓
        Generate secret number, coin toss, deduct balance
                         ↓
          GAME_START broadcast (to both players)
                         ↓
        Player → MAKE_GUESS → GameService.make_guess()
                         ↓
            Generate feedback (UP/DOWN/CORRECT)
                         ↓
         TURN_UPDATE or GAME_END broadcast
```

### Security and Data Consistency

**Race Condition Prevention:**
- `select_for_update()`: Database-level row locking
- `F()` expressions: Atomic balance updates
- `transaction.atomic()`: ACID transaction guarantee

**Authentication:**
- JWT tokens (access + refresh)
- Token storage in localStorage
- WebSocket authentication via query string

**CORS:**
- Only accepts requests from allowed origins
- Credentials support (cookies/authorization headers)

### Database Design

**Relational Model:**
- User → Transaction (1:N)
- User → Room (creator, player1, player2)
- Room → Game (1:1)
- Game → Guess (1:N)
- Game → User (current_turn, winner)

**Transaction History:**
All balance changes are logged in the `Transaction` table (audit trail).

## Features

### User Features

#### Dashboard
- Welcome message and balance display
- "Create New Room" button to create a new room
- "Leaderboard" button to access rankings
- "My Transactions" button to access transaction history
- List of open rooms (with Join buttons)

#### Leaderboard
- Top 50 player rankings
- Medal system for top 3 (gold, silver, bronze)
- Displayed information:
  - Rank
  - Player email
  - Wins count
  - Total games count
  - Win rate percentage
  - Balance
- Ranking criteria: First by wins count, then by balance

#### Transactions
- **4 Statistics Cards**:
  - Total Deposits
  - Total Withdraws
  - Total Bets
  - Total Wins
- **Transaction List**:
  - Complete transaction history (deposit, withdraw, bet, win, refund)
  - Icon and color coding for each transaction type
  - Date and time information
  - Positive/Negative amount display
- **Filter System**:
  - All
  - Deposits
  - Withdraws
  - Bets
  - Wins

#### Game Screen
- Real-time WebSocket connection
- Game status display (Waiting, In Progress, Completed)
- Turn information (Your Turn / Opponent's Turn)
- Guess input field (1-100 range)
- Guess history (all guesses and feedback)
- Game result screen (winner, loser, round count)

### Admin Features

#### Admin Panel (Custom React Page)

**5 Tab System:**

1. **Users**
   - All users list
   - Email search
   - Role filtering (player/admin)
   - User information: ID, Email, Role, Age, Balance, Join Date

2. **Transactions**
   - All transaction history (system-wide)
   - Type filtering (deposit, withdraw, bet, win, refund)
   - Transaction details: ID, User, Type, Amount, Date

3. **Rooms**
   - All rooms list
   - Status filtering (OPEN, FULL, COMPLETED)
   - Room information: ID, Bet Amount, Status, Creator, Players, Date

4. **Games**
   - All games list
   - Status filtering (IN_PROGRESS, COMPLETED)
   - Game information: ID, Room, Status, Players, Winner, Bet Amount, Guesses, Date

5. **Bet Settings**
   - Minimum Bet (Min Gold)
   - Maximum Bet (Max Gold)
   - Step Increment
   - Update form
   - Current settings display

**Admin Features:**
- Only accessible by users with `role='admin'`
- Automatically redirected to `/admin` page upon login
- "Admin Panel" button visible in header
- Modern, responsive UI
- Real-time data loading
- Beautiful table design

## Assumptions

1. **Virtual Currency System**: Uses virtual currency called "Gold", not real money. Starting balance is 1000 Gold.

2. **Two-Player Logic**: Each room accepts exactly 2 players. 1v1 game logic.

3. **Single Game Per Room**: Only 1 game is played per room. After the game ends, the room status changes to COMPLETED and cannot be reused.

4. **Winner Takes All**: The winning player receives both players' bet amounts (2x bet). The loser receives nothing.

5. **Turn-Based Guessing**: Players cannot guess simultaneously; there is a turn system. After each guess, the turn automatically passes to the other player.

6. **Email-Based Authentication**: Authentication is done via email address instead of username.

7. **Age Verification**: Minimum age requirement of 18 to register. Age information is taken during registration (no email verification, user declaration is accepted).

8. **Fixed Bet Amount**: The bet amount determined when creating a room cannot be changed during the game.

9. **Balance Check**: When a user creates a new room or joins an existing room, their balance is checked to ensure it meets the bet amount.

10. **Automatic Game Start**: When both players join the room and connect to WebSocket, the game starts automatically (no manual "start" button required).

11. **Secret Number Range**: The secret number to be guessed is always an integer between 1-100 (inclusive).

12. **Coin Toss**: The first turn at the start of the game is determined by a random coin toss (fair distribution).

## Deliberately Not Implemented

The following features were **deliberately** not implemented within the scope of this case study:

1. **Email Verification**: Since the case study document states "mock is acceptable," real email sending and verification system was not implemented. Users can log in directly after registration.

2. **Player Disconnection Scenario**: The case study mentions "a simple scenario should be handled if a player's connection drops." Currently, if the connection drops, the game continues but the disconnected player cannot return to the game until they manually refresh. No automatic reconnection or timeout mechanism.

3. **Profile Page**: The case study requests "profile and balance viewing" in the user-side screens. Balance is shown in the header, but there is no separate profile page.

---

**Note:** For detailed technical documentation, see `PROJECT_DOCUMENTATION.md` (2400+ lines of architecture details, API reference, deployment guide).
