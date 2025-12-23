# 2-PLAYER BETTING GUESSING GAME - COMPLETE TECHNICAL DOCUMENTATION

## İÇİNDEKİLER
1. [Proje Özeti](#proje-özeti)
2. [Teknoloji Stack](#teknoloji-stack)
3. [Mimari Yapı](#mimari-yapı)
4. [Backend - Django (Python)](#backend---django-python)
5. [Frontend - React (JavaScript)](#frontend---react-javascript)
6. [WebSocket İletişimi](#websocket-iletişimi)
7. [Veritabanı Yapısı](#veritabanı-yapısı)
8. [Authentication & Authorization](#authentication--authorization)
9. [Oyun Akışı - Detaylı](#oyun-akışı---detaylı)
10. [Deployment - Railway](#deployment---railway)
11. [API Endpoints](#api-endpoints)
12. [Önemli Dosyalar ve Açıklamaları](#önemli-dosyalar-ve-açıklamaları)

---

## PROJE ÖZETİ

**Proje Adı:** 2-Player Betting Guessing Game (İki Oyunculu Bahisli Tahmin Oyunu)

**Açıklama:** İki oyuncunun bahis koyarak 1-100 arası gizli sayıyı tahmin etmeye çalıştığı, gerçek zamanlı, çok oyunculu bir web uygulaması.

**Temel Özellikler:**
- ✅ Kullanıcı kayıt ve giriş sistemi (JWT Authentication)
- ✅ Sanal cüzdan sistemi (Gold - başlangıç 1000 Gold)
- ✅ Oda oluşturma ve listeleme
- ✅ Gerçek zamanlı oyun (WebSocket)
- ✅ Tahmin-geri bildirim sistemi (UP/DOWN/CORRECT)
- ✅ Otomatik tur değiştirme
- ✅ Kazanan ödül sistemi (2x bahis tutarı)
- ✅ Transaction geçmişi

**Canlı URL'ler:**
- Frontend: https://splendid-youth-production-f3f7.up.railway.app
- Backend: https://2-player-guessing-game-production.up.railway.app

---

## TEKNOLOJI STACK

### Backend
```
Framework:     Django 5.0
API:           Django REST Framework 3.14.0
WebSocket:     Django Channels 4.0.0
ASGI Server:   Daphne 4.1.0
Database:      PostgreSQL (via psycopg[binary] 3.2.3)
Cache/Queue:   Redis (channels-redis 4.2.0)
Auth:          JWT (djangorestframework-simplejwt 5.3.1)
CORS:          django-cors-headers 4.3.1
Static Files:  whitenoise 6.6.0
DB Config:     dj-database-url 2.1.0
```

### Frontend
```
Framework:     React 18.3.1
Router:        react-router-dom 6.28.0
HTTP Client:   axios 1.7.9
WebSocket:     Native WebSocket API
Styling:       CSS3 (Custom)
Build Tool:    Create React App
```

### DevOps & Deployment
```
Platform:      Railway (PaaS)
Database:      Railway PostgreSQL
Cache:         Railway Redis
Build:         nixpacks.toml
Process:       start.sh (bash script)
Version Ctrl:  Git/GitHub
```

---

## MIMARI YAPI

### Yüksek Seviye Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│   (https://splendid-youth-production-f3f7.up.railway.app)   │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                │ HTTP/HTTPS (REST API)       │ WSS (WebSocket)
                │                             │
┌───────────────▼─────────────────────────────▼───────────────┐
│                    RAILWAY PROXY LAYER                       │
│          (SSL Termination, Load Balancing)                   │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                │ HTTP (Internal)             │ WS (Internal)
                │                             │
┌───────────────▼─────────────────────────────▼───────────────┐
│                   DJANGO BACKEND (Daphne)                    │
│   (https://2-player-guessing-game-production.up.railway.app) │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ REST API    │  │  WebSocket   │  │   Admin      │       │
│  │ (DRF)       │  │  Consumers   │  │   Panel      │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Models    │  │   Services   │  │ Serializers  │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                │                             │
        ┌───────▼───────┐             ┌───────▼───────┐
        │  PostgreSQL   │             │     Redis     │
        │   Database    │             │ Channel Layer │
        │   (Railway)   │             │   (Railway)   │
        └───────────────┘             └───────────────┘
```

### Veri Akışı

#### 1. Authentication Flow
```
User → Login Form → POST /api/auth/login/ → Django
                                            ↓
                                      Validate Credentials
                                            ↓
                                    Generate JWT Tokens
                                            ↓
User ← Return {access, refresh} ← Response
     ↓
Store in localStorage
     ↓
All future requests: Authorization: Bearer <token>
```

#### 2. Room Creation & Joining Flow
```
Player1 → Create Room (POST /api/game/rooms/create/)
              ↓
        Deduct balance? NO (deducted when game starts)
              ↓
        Create Room in DB (status: OPEN)
              ↓
        Return room_id
              ↓
Player2 → See room in list (GET /api/game/rooms/)
              ↓
        Join room (POST /api/game/rooms/{id}/join/)
              ↓
        Check: Not already full
              ↓
        Add player2, Set status: FULL
              ↓
        Return success
```

#### 3. Game Flow (WebSocket)
```
Player1 & Player2 → Connect WebSocket
                    ws://backend/ws/game/{room_id}/?token={jwt}
                        ↓
                  JWT Middleware validates token
                        ↓
                  Check: User is participant
                        ↓
                  Accept connection
                        ↓
                  Send CONNECTION_SUCCESS
                        ↓
Both Players → Send JOIN_GAME event
                        ↓
              Check: Game exists?
                        ↓
              NO → Start new game:
                   1. Generate secret (1-100)
                   2. Coin toss for first player
                   3. Deduct bets from both players
                   4. Create Game record
                   5. Broadcast GAME_START to both
                        ↓
              YES → Send current GAME_STATE
                        ↓
Current Player → Send MAKE_GUESS {guess_number}
                        ↓
              Validate: Is it player's turn?
                        ↓
              Generate feedback (UP/DOWN/CORRECT)
                        ↓
              Create Guess record
                        ↓
              CORRECT?
                ├─ YES → End game
                │        Award winner 2x bet
                │        Broadcast GAME_END
                │
                └─ NO → Switch turn
                         Broadcast TURN_UPDATE
```

---

## BACKEND - DJANGO (PYTHON)

### Proje Yapısı

```
backend/
├── config/                      # Ana Django ayarları
│   ├── settings.py             # Tüm konfigürasyon (DB, CORS, JWT, etc.)
│   ├── urls.py                 # Ana URL router
│   ├── asgi.py                 # ASGI application (WebSocket için)
│   └── wsgi.py                 # WSGI application
│
├── apps/
│   ├── users/                  # Kullanıcı yönetimi app
│   │   ├── models.py          # User, Transaction modelleri
│   │   ├── serializers.py     # DRF serializers
│   │   ├── views.py           # API views (register, login, profile)
│   │   └── urls.py            # /api/auth/* endpoints
│   │
│   └── game/                   # Oyun mantığı app
│       ├── models.py          # BetSettings, Room, Game, Guess
│       ├── services.py        # GameService (business logic)
│       ├── serializers.py     # DRF serializers
│       ├── views.py           # API views (rooms, games)
│       ├── consumers.py       # WebSocket consumer
│       ├── middleware.py      # JWT WebSocket middleware
│       ├── routing.py         # WebSocket URL routing
│       └── urls.py            # /api/game/* endpoints
│
├── manage.py                   # Django CLI
├── start.sh                    # Railway başlatma scripti
├── check_env.py               # Environment variable debug script
├── requirements.txt           # Python bağımlılıkları
└── Procfile                   # Railway process tanımı
```

### Core Models Detayı

#### 1. User Model (`apps/users/models.py`)

```python
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)      # Username yerine email
    age = models.IntegerField(min=18)           # Yaş kontrolü
    role = models.CharField(...)                # 'player' veya 'admin'
    balance = models.DecimalField(default=1000) # Başlangıç: 1000 Gold
    is_active = models.BooleanField(...)
    is_staff = models.BooleanField(...)

    USERNAME_FIELD = 'email'  # Email ile giriş
```

**Önemli Özellikler:**
- Custom User Manager (`UserManager`)
- Email-based authentication
- Başlangıç bakiyesi: 1000 Gold
- `balance` alanı: `DecimalField` (hassas hesaplama için)

#### 2. Transaction Model

```python
class Transaction(models.Model):
    user = ForeignKey(User)
    amount = DecimalField(...)
    type = CharField(choices=['deposit', 'withdraw', 'bet', 'win', 'refund'])
    created_at = DateTimeField(...)
```

**Ne zaman oluşturulur:**
- `bet`: Oyun başladığında (her iki oyuncu için)
- `win`: Oyun bittiğinde (kazanan için)

#### 3. BetSettings Model (Singleton)

```python
class BetSettings(models.Model):
    min_bet = DecimalField(default=10.00)
    max_bet = DecimalField(default=1000.00)
    step = DecimalField(default=5.00)

    def save(self):
        self.pk = 1  # Singleton pattern: Sadece ID=1 kaydı var
```

**Kullanım:** Admin panelinden bet miktarları ayarlanabilir.

#### 4. Room Model

```python
class Room(models.Model):
    bet_amount = DecimalField(...)
    status = CharField(choices=['OPEN', 'FULL', 'COMPLETED'])
    creator = ForeignKey(User)
    player1 = ForeignKey(User, null=True)
    player2 = ForeignKey(User, null=True)
    created_at, updated_at = ...

    def add_player(self, user):
        # Player1 boşsa oraya, değilse player2'ye ekle
        # 2 oyuncu dolunca status='FULL'
```

**Durum Geçişleri:**
```
OPEN → FULL (2. oyuncu katıldığında)
FULL → COMPLETED (oyun bittiğinde)
```

#### 5. Game Model

```python
class Game(models.Model):
    room = OneToOneField(Room)              # Her room'un 1 game'i
    secret_number = IntegerField(1-100)     # Tahmin edilecek sayı
    current_turn = ForeignKey(User)         # Şu an kimin sırası
    status = CharField(choices=['IN_PROGRESS', 'COMPLETED'])
    winner = ForeignKey(User, null=True)
    started_at, ended_at = ...
```

#### 6. Guess Model

```python
class Guess(models.Model):
    game = ForeignKey(Game)
    player = ForeignKey(User)
    guess_number = IntegerField(1-100)
    feedback = CharField(choices=['UP', 'DOWN', 'CORRECT'])
    created_at = ...
```

**Feedback Mantığı:**
```python
if guess == secret:      → 'CORRECT' (Oyun biter)
elif guess < secret:     → 'UP' (Daha yüksek tahmin et)
else:                    → 'DOWN' (Daha düşük tahmin et)
```

### GameService - Business Logic

`apps/game/services.py` - Tüm oyun mantığı burada:

#### start_game(room)
```python
1. Room durumu FULL mu kontrol et
2. Secret number üret (1-100 arası random)
3. Coin toss - ilk oyuncu seç (random)
4. Game kaydı oluştur
5. Her iki oyuncudan bet_amount düş (ATOMIC transaction)
6. Transaction kayıtları oluştur (type='bet')
7. Return game
```

**Kritik:** `select_for_update()` ile database-level lock alınır (race condition önleme).

#### make_guess(game, player, guess_number)
```python
1. Oyun IN_PROGRESS mu kontrol et
2. Sıra bu oyuncuda mı kontrol et
3. Tahmin 1-100 arası mı kontrol et
4. Feedback üret (get_feedback)
5. Guess kaydı oluştur
6. CORRECT ise:
   - end_game(game, player) çağır
   Değilse:
   - switch_turn(game) çağır
7. Return guess
```

#### end_game(game, winner)
```python
1. Game status → COMPLETED
2. Winner set et
3. Room status → COMPLETED
4. Kazanana winnings ver: bet_amount * 2
5. Transaction kaydı oluştur (type='win')
```

### WebSocket Consumer

`apps/game/consumers.py` - GameConsumer sınıfı:

#### Bağlantı Akışı
```python
async def connect(self):
    1. room_id al (URL'den)
    2. User kontrolü (JWT middleware'den gelir)
    3. Anonymous user ise reddet (code=4001)
    4. User participant mı kontrol et (check_room_participant)
    5. Değilse reddet (code=4003)
    6. Channel layer'a group ekle: f'game_room_{room_id}'
    7. Accept connection
    8. Send CONNECTION_SUCCESS mesajı
```

#### Event Handlers
```python
receive(text_data):
    - type: 'JOIN_GAME' → handle_join_game()
    - type: 'MAKE_GUESS' → handle_make_guess(guess_number)

handle_join_game():
    1. Oyun var mı kontrol et
    2. Varsa → Mevcut state gönder
    3. Yoksa → start_game() çağır, GAME_START broadcast et

handle_make_guess(guess_number):
    1. process_guess() çağır (sync → async)
    2. Success ise:
       - Game bittiyse: GAME_END broadcast
       - Devam ediyorsa: TURN_UPDATE broadcast
    3. Error ise: ERROR mesajı gönder
```

#### Group Broadcasting
```python
# channel_layer.group_send() ile tüm odadaki oyunculara mesaj gönderilir
await self.channel_layer.group_send(
    'game_room_5',
    {
        'type': 'turn_updated',  # Handler method adı (turn_updated)
        'game': game_data,
        'guess': guess_data
    }
)

# Bu, tüm bağlı client'larda turn_updated() methodunu tetikler:
async def turn_updated(self, event):
    await self.send(text_data=json.dumps({
        'type': 'TURN_UPDATE',
        'game': event['game'],
        'guess': event['guess']
    }))
```

### JWT WebSocket Middleware

`apps/game/middleware.py` - Token doğrulama:

```python
class JWTAuthMiddleware:
    async def __call__(self, scope, receive, send):
        # Query string'den token al: ?token=xxx
        token = parse_qs(scope['query_string'])[b'token'][0]

        # JWT decode et
        decoded = AccessToken(token)
        user = await get_user(decoded['user_id'])

        # scope['user'] set et
        scope['user'] = user

        # Consumer'a geç
        return await self.inner(scope, receive, send)
```

**Neden:** WebSocket bağlantısında HTTP header gönderilemediği için token query string'de gönderilir.

### Django Settings Önemli Konfigürasyonlar

#### Database Configuration (Railway Detection)
```python
RAILWAY_ENVIRONMENT = os.getenv('RAILWAY_ENVIRONMENT')

if RAILWAY_ENVIRONMENT:
    # Railway'de çalışıyor
    if os.getenv('DATABASE_URL'):
        # DATABASE_URL varsa kullan
        DATABASES = {'default': dj_database_url.config(...)}
    else:
        # Yoksa direct PostgreSQL config (fallback)
        DATABASES = {
            'default': {
                'HOST': 'postgres.railway.internal',
                'NAME': 'railway',
                'USER': 'postgres',
                'PASSWORD': os.getenv('PGPASSWORD') or 'hardcoded',
                # ...
            }
        }
else:
    # Local development
    DATABASES = {'default': {'HOST': 'localhost', ...}}
```

#### CORS Configuration
```python
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS').split(',')
# Production: https://splendid-youth-production-f3f7.up.railway.app

CORS_ALLOW_CREDENTIALS = True  # Cookie/Auth header için
```

**Kritik:** Middleware sırası önemli!
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # EN ÜSTTE!
    'django.middleware.security.SecurityMiddleware',
    # ...
]
```

#### SSL Redirect (Railway Proxy)
```python
if not DEBUG:
    # Railway proxy'den X-Forwarded-Proto header'ı güven
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
```

**Neden:** Railway, SSL'i proxy seviyesinde sonlandırır. Django'ya HTTP gelir ama aslında HTTPS. Bu ayar olmadan infinite redirect loop oluşur.

#### Channel Layers (Redis)
```python
if os.getenv('REDIS_URL'):
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {"hosts": [os.getenv('REDIS_URL')]},
        },
    }
```

**Önemli:** Redis olmadan WebSocket çalışmaz! Railway'de Redis plugin eklenmelidir.

---

## FRONTEND - REACT (JAVASCRIPT)

### Proje Yapısı

```
frontend/
├── public/
│   └── index.html
│
├── src/
│   ├── components/           # React bileşenleri
│   │   ├── Login.js         # Giriş formu
│   │   ├── Signup.js        # Kayıt formu
│   │   ├── Dashboard.js     # Ana sayfa (room listesi)
│   │   ├── Header.js        # Üst bar (balance, logout)
│   │   ├── RoomList.js      # Oda listesi tablosu
│   │   ├── CreateRoomModal.js  # Oda oluşturma modalı
│   │   ├── Game.js          # Oyun ekranı (WebSocket)
│   │   └── PrivateRoute.js  # Auth guard
│   │
│   ├── contexts/
│   │   └── AuthContext.js   # Global auth state
│   │
│   ├── services/
│   │   ├── api.js           # Axios instance (base config)
│   │   ├── authService.js   # Login, register, logout
│   │   ├── roomService.js   # Room CRUD operations
│   │   └── websocketService.js  # WebSocket manager
│   │
│   ├── App.js               # Ana router
│   ├── App.css              # Global stiller
│   └── index.js             # React DOM render
│
├── .env.production          # Production env variables
├── package.json
└── nixpacks.toml           # Railway build config
```

### Ana Bileşenler Detayı

#### 1. AuthContext - Global State Management

```javascript
// contexts/AuthContext.js
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde token'dan user bilgisi al
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    localStorage.setItem('access_token', response.access);
    localStorage.setItem('refresh_token', response.refresh);
    setUser(response.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Kullanım:** Her component'te `const { user, login, logout } = useAuth();`

#### 2. API Service - Axios Configuration

```javascript
// services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Her request'e token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 hatalarında logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### 3. WebSocket Service - Singleton Pattern

```javascript
// services/websocketService.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.roomId = null;
    this.listeners = {};  // Event listener'ları sakla
  }

  connect(roomId) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('access_token');
      const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

      // WebSocket URL: wss://backend/ws/game/{roomId}/?token={jwt}
      this.ws = new WebSocket(
        `${WS_URL}/ws/game/${roomId}/?token=${token}`
      );

      this.ws.onopen = () => {
        this.roomId = roomId;
        resolve();
      };

      this.ws.onerror = (error) => reject(error);

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onclose = () => {
        this.emit('disconnected', {});
      };
    });
  }

  handleMessage(data) {
    const type = data.type;

    // Event mapping (backend → frontend)
    const eventMap = {
      'CONNECTION_SUCCESS': 'connectionSuccess',
      'GAME_STATE': 'gameState',
      'GAME_START': 'gameStart',
      'TURN_UPDATE': 'turnUpdate',
      'GAME_END': 'gameEnd',
      'ERROR': 'error',
    };

    const event = eventMap[type];
    if (event) {
      this.emit(event, data);
    }
  }

  // Event emitter pattern
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Backend'e mesaj gönder
  joinGame() {
    this.send({ type: 'JOIN_GAME' });
  }

  makeGuess(guessNumber) {
    this.send({ type: 'MAKE_GUESS', guess_number: guessNumber });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.roomId = null;
      this.listeners = {};
    }
  }
}

// Singleton instance
const websocketServiceInstance = new WebSocketService();
export default websocketServiceInstance;
```

#### 4. Game Component - Oyun Ekranı

```javascript
// components/Game.js
const Game = () => {
  const { roomId } = useParams();  // URL'den: /game/:roomId
  const { user, refreshUser } = useAuth();
  const [game, setGame] = useState(null);
  const [guessNumber, setGuessNumber] = useState('');

  useEffect(() => {
    let mounted = true;

    const connectAndJoin = async () => {
      // WebSocket'e bağlan
      await websocketService.connect(roomId);

      // Event listener'ları kur
      websocketService.on('connectionSuccess', () => {
        websocketService.joinGame();
      });

      websocketService.on('gameState', (gameData) => {
        if (mounted) setGame(gameData);
      });

      websocketService.on('gameStart', (gameData) => {
        if (mounted) {
          setGame(gameData);
          // Oyun başladı, state'i güncelle
        }
      });

      websocketService.on('turnUpdate', ({ game: gameData, guess }) => {
        if (mounted) {
          setGame(gameData);
          setGuessNumber('');
          // Tur güncellendi, tahmin inputu temizle
        }
      });

      websocketService.on('gameEnd', ({ game: gameData }) => {
        if (mounted) {
          setGame(gameData);
          refreshUser();  // Balance güncelle
          // Oyun bitti, kazanan belirlendi
        }
      });

      websocketService.on('error', ({ error }) => {
        alert(error);
      });
    };

    connectAndJoin();

    // Cleanup: Component unmount'ta disconnect
    return () => {
      mounted = false;
      websocketService.disconnect();
    };
  }, [roomId, refreshUser]);

  const handleSubmitGuess = (e) => {
    e.preventDefault();
    const guess = parseInt(guessNumber);

    if (!guess || guess < 1 || guess > 100) {
      alert('1-100 arası bir sayı girin');
      return;
    }

    websocketService.makeGuess(guess);
  };

  // Render: Oyun durumuna göre UI
  if (!game) return <div>Loading...</div>;

  const isMyTurn = game.current_turn === user.id;
  const isGameOver = game.status === 'COMPLETED';

  return (
    <div className="game-container">
      <h2>Room {roomId}</h2>

      {isGameOver ? (
        <div className="game-over">
          <h3>{game.winner === user.id ? 'YOU WIN!' : 'YOU LOSE'}</h3>
          <p>Secret Number: {game.secret_number}</p>
        </div>
      ) : (
        <div className="game-active">
          <p>{isMyTurn ? 'Your Turn' : "Opponent's Turn"}</p>

          {isMyTurn && (
            <form onSubmit={handleSubmitGuess}>
              <input
                type="number"
                min="1"
                max="100"
                value={guessNumber}
                onChange={(e) => setGuessNumber(e.target.value)}
              />
              <button type="submit">Guess</button>
            </form>
          )}

          <div className="guess-history">
            <h4>Guesses:</h4>
            {game.guesses.map((guess) => (
              <div key={guess.id}>
                {guess.player_email}: {guess.guess_number} → {guess.feedback}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

#### 5. Dashboard Component - Ana Sayfa

```javascript
// components/Dashboard.js
const Dashboard = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    const data = await roomService.getRooms();
    setRooms(data);
  };

  const handleCreateRoom = async (betAmount) => {
    await roomService.createRoom(betAmount);
    loadRooms();
    setShowCreateModal(false);
  };

  const handleJoinRoom = async (roomId) => {
    await roomService.joinRoom(roomId);
    navigate(`/game/${roomId}`);
  };

  return (
    <div>
      <Header />

      <div className="dashboard">
        <div className="user-info">
          <p>Balance: {user.balance} Gold</p>
        </div>

        <button onClick={() => setShowCreateModal(true)}>
          Create Room
        </button>

        <RoomList
          rooms={rooms}
          onJoin={handleJoinRoom}
          currentUser={user}
        />

        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateRoom}
          />
        )}
      </div>
    </div>
  );
};
```

### Routing Yapısı

```javascript
// App.js
<Router>
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />

    {/* Protected routes */}
    <Route path="/dashboard" element={
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    } />

    <Route path="/game/:roomId" element={
      <PrivateRoute>
        <Game />
      </PrivateRoute>
    } />
  </Routes>
</Router>
```

**PrivateRoute:** Token yoksa `/login`'e redirect eder.

---

## WEBSOCKET İLETİŞİMİ

### Bağlantı Kurmak

**Frontend → Backend:**
```javascript
ws = new WebSocket('wss://backend/ws/game/5/?token=eyJ0eXAi...')
```

**Backend tarafında:**
1. `JWTAuthMiddleware` token'ı doğrular
2. `GameConsumer.connect()` çağrılır
3. User, room participant kontrolü yapılır
4. Bağlantı kabul edilir: `await self.accept()`

### Event Types

#### Backend → Frontend

| Event Type | Açıklama | Data |
|------------|----------|------|
| `CONNECTION_SUCCESS` | Bağlantı başarılı | `{room_id}` |
| `GAME_STATE` | Mevcut oyun durumu | `{game: {...}}` |
| `GAME_START` | Oyun başladı | `{game: {...}}` |
| `TURN_UPDATE` | Tur güncellendi | `{game: {...}, guess: {...}}` |
| `GAME_END` | Oyun bitti | `{game: {...}, guess: {...}}` |
| `ERROR` | Hata oluştu | `{error: "..."}` |

#### Frontend → Backend

| Event Type | Açıklama | Data |
|------------|----------|------|
| `JOIN_GAME` | Oyuna katıl/başlat | `{}` |
| `MAKE_GUESS` | Tahmin yap | `{guess_number: 42}` |

### Örnek Mesaj Akışı

```
1. Player1 connects:
   Frontend → {"type": "JOIN_GAME"}
   Backend  → {"type": "GAME_STATE", "game": null}  (henüz oyun yok)

2. Player2 connects:
   Frontend → {"type": "JOIN_GAME"}
   Backend  → Start game...
   Backend  → (BROADCAST) {"type": "GAME_START", "game": {...}}
              (Her iki oyuncuya gönderilir)

3. Player1 makes guess:
   Frontend → {"type": "MAKE_GUESS", "guess_number": 50}
   Backend  → Process guess (feedback: 'UP')
   Backend  → (BROADCAST) {"type": "TURN_UPDATE", "game": {...}, "guess": {...}}

4. Player2 makes guess:
   Frontend → {"type": "MAKE_GUESS", "guess_number": 75}
   Backend  → Process guess (feedback: 'CORRECT')
   Backend  → (BROADCAST) {"type": "GAME_END", "game": {...}, "guess": {...}}
```

---

## VERİTABANI YAPISI

### ER Diagram

```
┌─────────────────────┐
│       User          │
├─────────────────────┤
│ id (PK)             │
│ email (UNIQUE)      │
│ password (hashed)   │
│ age                 │
│ role                │
│ balance             │
│ is_active           │
│ is_staff            │
└─────────────────────┘
        │ 1
        │
        │ N
┌─────────────────────┐         ┌─────────────────────┐
│    Transaction      │         │     BetSettings     │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │         │ id (PK=1)          │
│ user_id (FK)        │         │ min_bet            │
│ amount              │         │ max_bet            │
│ type                │         │ step               │
│ created_at          │         └─────────────────────┘
└─────────────────────┘

        │ 1
        │
        │ N
┌─────────────────────┐
│       Room          │
├─────────────────────┤
│ id (PK)             │
│ bet_amount          │
│ status              │
│ creator_id (FK)     │
│ player1_id (FK)     │───┐
│ player2_id (FK)     │───┤  (to User)
│ created_at          │   │
│ updated_at          │   │
└─────────────────────┘   │
        │ 1               │
        │                 │
        │ 1               │
┌─────────────────────┐   │
│       Game          │   │
├─────────────────────┤   │
│ id (PK)             │   │
│ room_id (FK, 1-1)   │   │
│ secret_number       │   │
│ current_turn_id(FK) │───┘
│ status              │
│ winner_id (FK)      │───┐
│ started_at          │   │ (to User)
│ ended_at            │   │
└─────────────────────┘   │
        │ 1               │
        │                 │
        │ N               │
┌─────────────────────┐   │
│       Guess         │   │
├─────────────────────┤   │
│ id (PK)             │   │
│ game_id (FK)        │   │
│ player_id (FK)      │───┘
│ guess_number        │
│ feedback            │
│ created_at          │
└─────────────────────┘
```

### Database Queries - Örnekler

#### Oyun Başlatma (Transaction)
```python
with transaction.atomic():
    # 1. Secret number üret
    secret = random.randint(1, 100)

    # 2. Game oluştur
    game = Game.objects.create(room=room, secret_number=secret, ...)

    # 3. Player balance'ları güncelle (LOCK ile)
    player1 = User.objects.select_for_update().get(pk=room.player1_id)
    player1.balance = F('balance') - room.bet_amount
    player1.save()

    player2 = User.objects.select_for_update().get(pk=room.player2_id)
    player2.balance = F('balance') - room.bet_amount
    player2.save()

    # 4. Transaction kayıtları
    Transaction.objects.create(user=player1, amount=room.bet_amount, type='bet')
    Transaction.objects.create(user=player2, amount=room.bet_amount, type='bet')
```

**Kritik:** `select_for_update()` database-level row lock sağlar. İki oyuncu aynı anda başlatsa bile race condition olmaz.

#### Guess History Sorgulama
```python
# Bir oyunun tüm tahminleri (sıralı)
guesses = Guess.objects.filter(game_id=5).order_by('created_at').select_related('player')

# JOIN yapılır: Guess JOIN User (player email için)
```

#### User Balance Update (F Expression)
```python
# F() expression kullanarak atomic güncelleme
user.balance = F('balance') + winnings
user.save(update_fields=['balance'])

# SQL: UPDATE users SET balance = balance + 200 WHERE id = 1
```

**Neden F():** Database-level operasyon. Race condition önler.

---

## AUTHENTICATION & AUTHORIZATION

### JWT Token Flow

#### 1. Register
```
POST /api/auth/register/
Body: {email, password, age}

→ User oluştur (password hash'lenir)
→ Return: {user, access, refresh}
```

#### 2. Login
```
POST /api/auth/login/
Body: {email, password}

→ Credentials doğrula
→ Generate JWT tokens
→ Return: {access, refresh, user}
```

**Token Yapısı:**
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.
eyJ1c2VyX2lkIjoxLCJleHAiOjE3MDg2...}.
5Y7vK8qZ...

Header.Payload.Signature
```

**Payload:**
```json
{
  "user_id": 1,
  "exp": 1708612345,  // Expiration (60 dakika)
  "iat": 1708608745,  // Issued at
  "token_type": "access"
}
```

#### 3. Token Refresh
```
POST /api/auth/token/refresh/
Body: {refresh}

→ Refresh token doğrula
→ Generate new access token
→ Return: {access}
```

**Kullanım:** Access token expire olduğunda (60 dk) yeni token al.

#### 4. Logout
```
POST /api/auth/logout/
Header: Authorization: Bearer <access_token>
Body: {refresh}

→ Refresh token'ı blacklist'e ekle
→ Return: {success}
```

### Frontend Token Storage

```javascript
// Login sonrası
localStorage.setItem('access_token', response.access);
localStorage.setItem('refresh_token', response.refresh);

// Her API isteğinde
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 hatalarında
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expire oldu, logout
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### WebSocket Authentication

**Problem:** WebSocket bağlantısında HTTP header gönderilemez.

**Çözüm:** Token'ı query string'de gönder:
```javascript
ws = new WebSocket('wss://backend/ws/game/5/?token=eyJ0eXAi...')
```

**Backend Middleware:**
```python
class JWTAuthMiddleware:
    async def __call__(self, scope, receive, send):
        # Query string'den token al
        query_string = parse_qs(scope['query_string'].decode())
        token = query_string.get('token', [None])[0]

        if not token:
            await send({'type': 'websocket.close', 'code': 4001})
            return

        try:
            # JWT decode
            decoded = AccessToken(token)
            user = await get_user(decoded['user_id'])
            scope['user'] = user
        except:
            await send({'type': 'websocket.close', 'code': 4001})
            return

        return await self.inner(scope, receive, send)
```

---

## OYUN AKIŞI - DETAYLI

### Senaryo: İki Oyuncu, 50 Gold Bahis

#### Adım 1: Oda Oluşturma
```
Player1 (Balance: 1000):
  1. Dashboard'da "Create Room" butonuna tıklar
  2. Modal açılır: Bet amount = 50 Gold
  3. POST /api/game/rooms/create/ {bet_amount: 50}

Backend:
  4. User balance kontrolü: 1000 >= 50 ✓
  5. Room oluştur:
     - bet_amount: 50
     - status: OPEN
     - creator: Player1
     - player1: Player1
     - player2: null
  6. Return room_id: 5

Frontend:
  7. Room list'e yeni oda eklenir
  8. Modal kapanır
```

**Not:** Para henüz çekilmez! Sadece oda oluşturulur.

#### Adım 2: Odaya Katılma
```
Player2 (Balance: 800):
  1. Dashboard'da room list'te Room #5'i görür
  2. "Join" butonuna tıklar
  3. POST /api/game/rooms/5/join/

Backend:
  4. Kontroller:
     - Room status OPEN mı? ✓
     - Player zaten participant değil mi? ✓
     - Balance >= bet_amount? (800 >= 50) ✓
  5. Room güncelle:
     - player2: Player2
     - status: FULL
  6. Return success

Frontend:
  7. Navigate: /game/5
```

#### Adım 3: WebSocket Bağlantısı
```
Player1:
  1. Game component mount
  2. WebSocket connect: wss://backend/ws/game/5/?token=xxx
  3. Backend: JWT validate, participant check ✓
  4. Backend → Player1: {type: 'CONNECTION_SUCCESS'}
  5. Frontend → Backend: {type: 'JOIN_GAME'}
  6. Backend: Game yok, bekle...

Player2:
  1. Game component mount
  2. WebSocket connect: wss://backend/ws/game/5/?token=yyy
  3. Backend: JWT validate, participant check ✓
  4. Backend → Player2: {type: 'CONNECTION_SUCCESS'}
  5. Frontend → Backend: {type: 'JOIN_GAME'}
  6. Backend: 2. oyuncu da JOIN_GAME gönderdi, oyunu başlat!
```

#### Adım 4: Oyun Başlatma
```
Backend (GameService.start_game):
  1. Secret number üret: 42
  2. Coin toss: First player → Player2
  3. Create Game:
     - room: 5
     - secret_number: 42
     - current_turn: Player2
     - status: IN_PROGRESS

  4. ATOMIC Transaction:
     Player1: 1000 - 50 = 950
     Player2: 800 - 50 = 750

     Transaction(user=Player1, amount=50, type='bet')
     Transaction(user=Player2, amount=50, type='bet')

  5. BROADCAST (her iki oyuncuya):
     {
       type: 'GAME_START',
       game: {
         id: 10,
         room_id: 5,
         current_turn: Player2.id,
         status: 'IN_PROGRESS',
         player1: {id: 1, email: 'p1@test.com', balance: 950},
         player2: {id: 2, email: 'p2@test.com', balance: 750},
         guesses: []
       }
     }

Frontend (Her iki oyuncu):
  6. game state güncellenir
  7. UI render:
     - Player2: "Your Turn" + guess input gösterilir
     - Player1: "Opponent's Turn" + input disabled
```

#### Adım 5: İlk Tahmin
```
Player2 (secret: 42):
  1. Input'a 50 yazar, Submit
  2. Frontend → Backend: {type: 'MAKE_GUESS', guess_number: 50}

Backend (GameService.make_guess):
  3. Kontroller:
     - Game IN_PROGRESS? ✓
     - Player2'nin sırası mı? ✓
     - 1 <= 50 <= 100? ✓

  4. Feedback: 50 > 42 → 'DOWN'

  5. Create Guess:
     - game: 10
     - player: Player2
     - guess_number: 50
     - feedback: 'DOWN'

  6. Switch turn: current_turn → Player1

  7. BROADCAST (her iki oyuncuya):
     {
       type: 'TURN_UPDATE',
       game: {
         current_turn: Player1.id,
         guesses: [
           {id: 1, player_email: 'p2@test.com', guess_number: 50, feedback: 'DOWN'}
         ]
       },
       guess: {guess_number: 50, feedback: 'DOWN'}
     }

Frontend:
  8. game state güncellenir
  9. UI render:
     - Player1: "Your Turn" + input enabled
     - Player2: "Opponent's Turn" + input disabled
     - History: "p2@test.com: 50 → DOWN"
```

#### Adım 6-7: Tahminler Devam Eder
```
Turn 2 (Player1):
  Guess: 30 → Feedback: UP
  current_turn → Player2

Turn 3 (Player2):
  Guess: 40 → Feedback: UP
  current_turn → Player1

Turn 4 (Player1):
  Guess: 45 → Feedback: DOWN
  current_turn → Player2
```

#### Adım 8: Kazanan Tahmin
```
Player2:
  1. Input'a 42 yazar, Submit
  2. Frontend → Backend: {type: 'MAKE_GUESS', guess_number: 42}

Backend (GameService.make_guess):
  3. Feedback: 42 == 42 → 'CORRECT'

  4. Create Guess:
     - guess_number: 42
     - feedback: 'CORRECT'

  5. end_game(game, Player2):
     - game.status: COMPLETED
     - game.winner: Player2
     - game.ended_at: now()
     - room.status: COMPLETED

     - ATOMIC:
       Player2.balance: 750 + (50 * 2) = 850
       Transaction(user=Player2, amount=100, type='win')

  6. BROADCAST (her iki oyuncuya):
     {
       type: 'GAME_END',
       game: {
         status: 'COMPLETED',
         winner: Player2.id,
         secret_number: 42,
         player1: {balance: 950},
         player2: {balance: 850},
         guesses: [...]
       },
       guess: {guess_number: 42, feedback: 'CORRECT'}
     }

Frontend:
  7. game state güncellenir
  8. refreshUser() çağrılır (balance güncellenir)
  9. UI render:
     - Player2: "YOU WIN! Secret: 42" + balance 850
     - Player1: "YOU LOSE. Secret: 42" + balance 950
     - History: Tüm tahminler gösterilir
```

### Final Durum
```
Player1: 1000 → 950 (50 kaybetti)
Player2: 800 → 850 (50 kazandı)

Room #5: COMPLETED
Game #10: COMPLETED, Winner: Player2

Transactions:
  - Player1: -50 (bet)
  - Player2: -50 (bet)
  - Player2: +100 (win)

Guesses:
  1. Player2: 50 → DOWN
  2. Player1: 30 → UP
  3. Player2: 40 → UP
  4. Player1: 45 → DOWN
  5. Player2: 42 → CORRECT ✓
```

---

## DEPLOYMENT - RAILWAY

### Railway Projesi Yapısı

```
Project: 2-player-guessing-game
├── PostgreSQL Service
│   └── Variables:
│       - DATABASE_URL (auto-generated)
│       - PGHOST: postgres.railway.internal
│       - PGDATABASE: railway
│       - PGUSER: postgres
│       - PGPASSWORD: (auto-generated)
│
├── Redis Service
│   └── Variables:
│       - REDIS_URL (auto-generated)
│
├── Backend Service (Django)
│   ├── Source: GitHub repo (backend/)
│   ├── Build: nixpacks (auto-detect Python)
│   ├── Start: bash start.sh
│   └── Variables:
│       - RAILWAY_ENVIRONMENT: production (auto-set)
│       - PORT: 8080 (auto-set)
│       - SECRET_KEY: <custom>
│       - DEBUG: False
│       - ALLOWED_HOSTS: 2-player-guessing-game-production.up.railway.app
│       - CORS_ALLOWED_ORIGINS: https://splendid-youth-production-f3f7.up.railway.app
│       - CSRF_TRUSTED_ORIGINS: (same as CORS)
│       - DATABASE_URL: ${{Postgres.DATABASE_URL}} (reference)
│       - REDIS_URL: ${{Redis.REDIS_URL}} (reference)
│
└── Frontend Service (React)
    ├── Source: GitHub repo (frontend/)
    ├── Build: nixpacks.toml
    ├── Start: npx serve -s build
    └── Variables:
        - REACT_APP_API_URL: https://2-player-guessing-game-production.up.railway.app
        - REACT_APP_WS_URL: wss://2-player-guessing-game-production.up.railway.app
```

### Backend Deployment Flow

#### 1. Railway Build Process
```bash
# Railway otomatik algılar: Python projesi
# requirements.txt'yi görünce pip install yapar

1. Detect runtime: Python 3.11
2. Install dependencies:
   pip install -r requirements.txt
3. Collect static files:
   python manage.py collectstatic --noinput
4. Start command:
   bash start.sh
```

#### 2. start.sh Script
```bash
#!/bin/bash

# Environment variables'ları logla (debug için)
python check_env.py

# Database migrations
python manage.py migrate --noinput
if [ $? -eq 0 ]; then
    echo "✓ Migrations completed"
else
    echo "✗ Migration failed"
    echo "⚠️  Continuing anyway"
fi

# Static files
python manage.py collectstatic --noinput --clear
if [ $? -eq 0 ]; then
    echo "✓ Static files collected"
else
    echo "✗ Static collection failed"
fi

# Port kontrolü
if [ -z "$PORT" ]; then
    echo "WARNING: PORT not set, using 8000"
    PORT=8000
fi

# Daphne ASGI server başlat
exec daphne -b 0.0.0.0 -p $PORT config.asgi:application
```

**Kritik:** `exec` kullanılır. Railway'nin SIGTERM sinyalini Daphne'ye iletmek için.

#### 3. check_env.py Debug Script
```python
# CORS configuration'ı logla
cors = os.getenv('CORS_ALLOWED_ORIGINS', 'NOT SET')
if cors != 'NOT SET':
    for origin in cors.split(','):
        print(f"  {origin} (length: {len(origin)})")
        if origin.endswith('/'):
            print(f"    ⚠️  WARNING: Trailing slash!")

# Database configuration
if os.getenv('DATABASE_URL'):
    print("✅ DATABASE_URL set")
else:
    print("❌ DATABASE_URL not set")

# Redis
if os.getenv('REDIS_URL'):
    print("✅ REDIS_URL set")
else:
    print("❌ REDIS_URL not set")
```

**Kullanım:** Deployment loglarında environment variable sorunlarını tespit etmek için.

### Frontend Deployment Flow

#### 1. nixpacks.toml Configuration
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x"]

[phases.install]
cmds = ["npm install --legacy-peer-deps"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve -s build -l $PORT"
```

**Açıklama:**
- `nodejs-20_x`: Node.js 20 kullan
- `--legacy-peer-deps`: Peer dependency uyumsuzluklarını görmezden gel
- `npm run build`: Production build oluştur (Create React App)
- `serve -s build`: Build klasörünü static serve et

#### 2. Build Process
```bash
1. Install Node.js 20
2. npm install --legacy-peer-deps
   → Dependencies install (react, react-router, axios, etc.)
3. npm run build
   → REACT_APP_* environment variables build'e gömülür
   → Optimized production build → /build klasörü
4. Start:
   npx serve -s build -l $PORT
   → Port 8080'de HTTP server başlatır
```

### Environment Variables - Kritik Noktalar

#### Backend Variables

**ALLOWED_HOSTS:**
```
# YANLIŞ (https:// ekleme)
ALLOWED_HOSTS=https://2-player-guessing-game-production.up.railway.app

# DOĞRU
ALLOWED_HOSTS=2-player-guessing-game-production.up.railway.app,localhost
```

**CORS_ALLOWED_ORIGINS:**
```
# YANLIŞ (trailing slash)
CORS_ALLOWED_ORIGINS=https://splendid-youth-production-f3f7.up.railway.app/

# DOĞRU
CORS_ALLOWED_ORIGINS=https://splendid-youth-production-f3f7.up.railway.app
```

**SECURE_PROXY_SSL_HEADER:**
```python
# settings.py'da MUTLAKA olmalı
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```
**Yoksa:** Infinite redirect loop (ERR_TOO_MANY_REDIRECTS)

#### Frontend Variables

**Önemli:** `REACT_APP_*` prefix zorunlu! Create React App sadece bu prefix'i tanır.

```bash
# Build time'da gömülür
REACT_APP_API_URL=https://2-player-guessing-game-production.up.railway.app
REACT_APP_WS_URL=wss://2-player-guessing-game-production.up.railway.app

# Runtime'da erişim
const apiUrl = process.env.REACT_APP_API_URL;
```

### Common Deployment Issues

#### 1. CORS Errors
```
Belirti: Frontend'den API'ye istek atılamıyor
        Browser console: "blocked by CORS policy"

Çözüm:
  ✓ CORS_ALLOWED_ORIGINS doğru mu?
  ✓ Trailing slash var mı?
  ✓ CorsMiddleware MIDDLEWARE listesinin EN ÜSTÜNDE mi?
```

#### 2. WebSocket Connection Failed
```
Belirti: Oyun ekranında "Failed to connect"
        Backend logs'ta connection rejected

Nedenler:
  1. Redis yok/çalışmıyor
     → Railway'de Redis plugin ekle
     → Backend'e REDIS_URL ekle

  2. JWT token geçersiz
     → Token expire olmuş, yeniden login

  3. User participant değil
     → Room'a doğru şekilde join olmamış
```

#### 3. Database Connection Error
```
Belirti: Backend başlamıyor
        Logs: "connection to 127.0.0.1:5432 failed"

Çözüm:
  ✓ DATABASE_URL backend service'e eklenmiş mi?
  ✓ PostgreSQL plugin çalışıyor mu?
  ✓ settings.py'da RAILWAY_ENVIRONMENT kontrolü var mı?
```

#### 4. Static Files 404
```
Belirti: Admin panel CSS yok
        /static/* 404 döndürüyor

Çözüm:
  ✓ whitenoise MIDDLEWARE'de var mı?
  ✓ collectstatic çalıştı mı? (logs kontrol)
  ✓ STATIC_ROOT doğru ayarlı mı?
```

#### 5. Redirect Loop
```
Belirti: Sayfa sürekli reload oluyor
        Browser: ERR_TOO_MANY_REDIRECTS

Çözüm:
  ✓ SECURE_PROXY_SSL_HEADER ayarlandı mı?
  ✓ settings.py'da:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

---

## API ENDPOINTS

### Authentication Endpoints

#### POST /api/auth/register/
```json
Request:
{
  "email": "player@example.com",
  "password": "securepass123",
  "age": 25
}

Response: 200 OK
{
  "user": {
    "id": 1,
    "email": "player@example.com",
    "age": 25,
    "role": "player",
    "balance": "1000.00"
  },
  "access": "eyJ0eXAiOiJKV1QiLC...",
  "refresh": "eyJ0eXAiOiJKV1QiLC..."
}
```

#### POST /api/auth/login/
```json
Request:
{
  "email": "player@example.com",
  "password": "securepass123"
}

Response: 200 OK
{
  "access": "eyJ0eXAiOiJKV1QiLC...",
  "refresh": "eyJ0eXAiOiJKV1QiLC...",
  "user": { ... }
}
```

#### GET /api/auth/me/
```
Headers:
  Authorization: Bearer eyJ0eXAiOiJKV1QiLC...

Response: 200 OK
{
  "id": 1,
  "email": "player@example.com",
  "age": 25,
  "role": "player",
  "balance": "950.00"
}
```

#### POST /api/auth/token/refresh/
```json
Request:
{
  "refresh": "eyJ0eXAiOiJKV1QiLC..."
}

Response: 200 OK
{
  "access": "eyJ0eXAiOiJKV1QiLC..."
}
```

#### POST /api/auth/logout/
```json
Request:
{
  "refresh": "eyJ0eXAiOiJKV1QiLC..."
}

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

### Game Endpoints

#### GET /api/game/rooms/
```
Response: 200 OK
[
  {
    "id": 5,
    "bet_amount": "50.00",
    "status": "OPEN",
    "creator": {
      "id": 1,
      "email": "player1@example.com"
    },
    "player1": { ... },
    "player2": null,
    "players_count": 1,
    "created_at": "2024-12-23T10:00:00Z"
  },
  ...
]
```

#### POST /api/game/rooms/create/
```json
Request:
{
  "bet_amount": 50
}

Response: 201 Created
{
  "id": 5,
  "bet_amount": "50.00",
  "status": "OPEN",
  "creator": { ... },
  "player1": { ... },
  "player2": null
}
```

#### POST /api/game/rooms/{id}/join/
```
Request: (boş body)

Response: 200 OK
{
  "message": "Joined room successfully",
  "room": {
    "id": 5,
    "status": "FULL",
    "player1": { ... },
    "player2": { ... }
  }
}
```

#### GET /api/game/rooms/{id}/
```
Response: 200 OK
{
  "id": 5,
  "bet_amount": "50.00",
  "status": "FULL",
  "player1": { ... },
  "player2": { ... },
  "game": {
    "id": 10,
    "status": "IN_PROGRESS",
    "current_turn": 2,
    "guesses": [...]
  }
}
```

#### GET /api/game/games/{id}/
```
Response: 200 OK
{
  "id": 10,
  "room": {
    "id": 5,
    "bet_amount": "50.00"
  },
  "status": "COMPLETED",
  "winner": {
    "id": 2,
    "email": "player2@example.com"
  },
  "current_turn": null,
  "guesses": [
    {
      "id": 1,
      "player": {
        "id": 2,
        "email": "player2@example.com"
      },
      "guess_number": 50,
      "feedback": "DOWN",
      "created_at": "2024-12-23T10:05:00Z"
    },
    ...
  ],
  "started_at": "2024-12-23T10:03:00Z",
  "ended_at": "2024-12-23T10:10:00Z"
}
```

### WebSocket Protocol

#### Connect
```
wss://backend/ws/game/{room_id}/?token={jwt_token}
```

#### Client → Server Messages

##### JOIN_GAME
```json
{
  "type": "JOIN_GAME"
}
```

##### MAKE_GUESS
```json
{
  "type": "MAKE_GUESS",
  "guess_number": 42
}
```

#### Server → Client Messages

##### CONNECTION_SUCCESS
```json
{
  "type": "CONNECTION_SUCCESS",
  "message": "Connected to game room",
  "room_id": "5"
}
```

##### GAME_START
```json
{
  "type": "GAME_START",
  "game": {
    "id": 10,
    "room_id": 5,
    "status": "IN_PROGRESS",
    "current_turn": 2,
    "player1": {...},
    "player2": {...},
    "guesses": []
  }
}
```

##### TURN_UPDATE
```json
{
  "type": "TURN_UPDATE",
  "game": {
    "current_turn": 1,
    "guesses": [...]
  },
  "guess": {
    "id": 3,
    "player_email": "player2@example.com",
    "guess_number": 40,
    "feedback": "UP"
  }
}
```

##### GAME_END
```json
{
  "type": "GAME_END",
  "game": {
    "status": "COMPLETED",
    "winner": 2,
    "secret_number": 42,
    "player1": {"balance": "950.00"},
    "player2": {"balance": "850.00"}
  },
  "guess": {
    "guess_number": 42,
    "feedback": "CORRECT"
  }
}
```

##### ERROR
```json
{
  "type": "ERROR",
  "error": "It's not your turn"
}
```

---

## ÖNEMLI DOSYALAR VE AÇIKLAMALARI

### Backend

#### config/settings.py
**Ne yapar:** Django'nun tüm ayarları
**Kritik noktalar:**
- `RAILWAY_ENVIRONMENT` detection
- `SECURE_PROXY_SSL_HEADER` (redirect loop önleme)
- `CorsMiddleware` sırası (EN ÜSTTE)
- `CHANNEL_LAYERS` (Redis)
- `SIMPLE_JWT` ayarları

**Mülakat sorusu:** "SSL redirect loop'u nasıl çözdünüz?"
**Cevap:** Railway proxy SSL terminate eder. Django'ya HTTP gelir. `SECURE_PROXY_SSL_HEADER` ile Django'ya X-Forwarded-Proto header'ına güvenmesini söyledim.

#### config/asgi.py
**Ne yapar:** ASGI application (WebSocket için)
**Kritik nokta:** Import sırası!
```python
# YANLIŞ
from apps.game.routing import websocket_urlpatterns  # Settings henüz yüklenmedi!
os.environ.setdefault(...)
django_asgi_app = get_asgi_application()

# DOĞRU
os.environ.setdefault(...)
django_asgi_app = get_asgi_application()  # ÖNCE Django'yu başlat
from apps.game.routing import websocket_urlpatterns  # SONRA import
```

#### apps/game/services.py
**Ne yapar:** Tüm oyun business logic
**Önemli methodlar:**
- `start_game()`: Secret üret, coin toss, balance düş
- `make_guess()`: Feedback üret, turn switch
- `end_game()`: Kazanana para ver, room'u completed yap

**Mülakat sorusu:** "Race condition nasıl önlediniz?"
**Cevap:** `select_for_update()` ile database-level row lock. `F()` expression ile atomic balance update.

#### apps/game/consumers.py
**Ne yapar:** WebSocket event handling
**Async/Sync:**
- Consumer methodları: `async`
- Database işlemleri: `@database_sync_to_async` decorator

**Mülakat sorusu:** "Group broadcasting nasıl çalışır?"
**Cevap:** `channel_layer.group_send()` ile odadaki tüm bağlı client'lara aynı anda mesaj gönderilir. Redis queue kullanılır.

#### apps/game/middleware.py
**Ne yapar:** WebSocket JWT authentication
**Neden gerekli:** WebSocket'te HTTP header gönderilemez, token query string'de gelir.

#### start.sh
**Ne yapar:** Railway deployment script
**Adımlar:**
1. Environment debug (check_env.py)
2. Migrate
3. Collectstatic
4. Daphne başlat

**Neden `exec`:** Railway'nin SIGTERM sinyalini Daphne'ye iletmek için. Graceful shutdown.

### Frontend

#### src/services/websocketService.js
**Ne yapar:** WebSocket bağlantı yönetimi
**Pattern:** Singleton + Event Emitter
**Methodlar:**
- `connect()`: WebSocket bağlantısı kur
- `on()`: Event listener ekle
- `emit()`: Event tetikle
- `send()`: Backend'e mesaj gönder

**Mülakat sorusu:** "Neden singleton pattern?"
**Cevap:** Aynı anda sadece 1 WebSocket bağlantısı olmalı. Multiple instance olursa duplicate event handler'lar çalışır.

#### src/contexts/AuthContext.js
**Ne yapar:** Global authentication state
**Metodlar:**
- `login()`: Token al, user state'i set et
- `logout()`: Token sil, user null yap
- `refreshUser()`: Balance güncelle (oyun bittikten sonra)

**Neden Context API:** Props drilling önlemek için. Her component'te `useAuth()` ile erişilebilir.

#### src/components/Game.js
**Ne yapar:** Oyun ekranı
**Lifecycle:**
1. Mount → WebSocket connect
2. JOIN_GAME gönder
3. Event listener'ları kur (gameStart, turnUpdate, gameEnd)
4. Unmount → Disconnect

**Cleanup:** `return () => { websocketService.disconnect(); }` (memory leak önleme)

---

## MÜLAKAT SORULARI VE CEVAPLARI

### Teknik Sorular

**S1: "Bu projede hangi teknolojileri kullandınız ve neden?"**
```
Backend:
- Django: Güçlü ORM, admin panel, güvenlik (CSRF, XSS koruması)
- Django Channels: WebSocket desteği, async support
- PostgreSQL: ACID, transaction support (balance güvenliği için kritik)
- Redis: Channel layer message queue, düşük latency
- JWT: Stateless authentication, frontend ile kolay entegrasyon

Frontend:
- React: Component-based, reusable UI
- React Router: SPA routing
- Context API: Global state (user, auth)
- Axios: HTTP client, interceptor support
```

**S2: "Race condition nasıl önlediniz?"**
```
1. Database-level locking:
   User.objects.select_for_update().get(pk=user_id)
   → Row-level lock, aynı anda iki transaction aynı satırı güncelleyemez

2. F() expression:
   user.balance = F('balance') - amount
   → Database-level operasyon, application-level race condition yok

3. Atomic transactions:
   with transaction.atomic():
       # Tüm işlemler tek transaction'da
       # Ya hepsi başarılı, ya hiçbiri
```

**S3: "WebSocket neden REST API'den farklı?"**
```
REST API:
- Client → Request → Server → Response (tek yönlü)
- Her request için yeni connection
- Polling gerekir (sürekli request atarak güncelleme kontrol)

WebSocket:
- Persistent bağlantı (açık kalır)
- Bi-directional (çift yönlü)
- Server, client'a istediği zaman mesaj gönderebilir
- Real-time (tahmin yapıldığı anda diğer oyuncu görür)

Kullanım:
- REST: Room listesi, user profil (one-time data)
- WebSocket: Oyun içi event'ler (turn updates, game end)
```

**S4: "CORS nedir ve neden hata aldınız?"**
```
CORS: Cross-Origin Resource Sharing
- Browser güvenlik mekanizması
- frontend.com, backend.com'a istek atınca browser bloklar
- Backend, Access-Control-Allow-Origin header'ı dönmelidir

Hatalar:
1. Trailing slash:
   CORS_ALLOWED_ORIGINS='https://frontend.com/'  ❌
   → Django system check error (E014)

2. Middleware sırası:
   CorsMiddleware, SecurityMiddleware'den SONRA olursa
   → OPTIONS request, redirect dönüyor, CORS header eklenemiyor

Çözüm:
- Trailing slash kaldır
- CorsMiddleware'i EN ÜSTE taşı
```

**S5: "Railway'de SSL redirect loop nasıl çözdünüz?"**
```
Problem:
- Railway, SSL'i proxy seviyesinde terminate eder
- Django'ya HTTP request gelir
- SECURE_SSL_REDIRECT=True → Django HTTPS'e redirect eder
- Railway yine HTTP forward eder → Infinite loop

Çözüm:
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

- Railway, X-Forwarded-Proto: https header'ı gönderir
- Django bu header'a güvenir, HTTP isteği HTTPS olarak kabul eder
- Redirect olmaz
```

**S6: "Balance güncelleme nasıl güvenli hale getirdiniz?"**
```
1. F() Expression:
   user.balance = F('balance') - amount
   → SQL: UPDATE users SET balance = balance - 50
   → Database-level, atomic

2. select_for_update():
   player1 = User.objects.select_for_update().get(pk=1)
   → Row lock, transaction bitene kadar başka transaction okuyamaz

3. Transaction atomicity:
   with transaction.atomic():
       player1.balance -= bet
       player2.balance -= bet
       # Ya her ikisi de başarılı, ya hiçbiri

4. Validation:
   if player.balance < bet_amount:
       raise ValueError("Insufficient balance")
```

### Mimari Sorular

**S7: "Bu projenin mimarisini anlatır mısınız?"**
```
1. Frontend (React SPA):
   - User interaction
   - REST API calls (axios)
   - WebSocket connection (real-time)

2. Backend (Django):
   - REST API (DRF)
   - WebSocket consumers (Django Channels)
   - Business logic (services.py)
   - Database ORM

3. Database (PostgreSQL):
   - User, Room, Game, Guess modelleri
   - ACID transactions

4. Redis:
   - Channel layer (WebSocket message queue)
   - Pub/Sub pattern

5. Railway:
   - Deployment platform
   - PostgreSQL, Redis plugins
   - Auto-deploy (GitHub push)

Flow:
User → React → Axios → Django API → PostgreSQL
User → React → WebSocket → Django Consumer → Redis → Other Clients
```

**S8: "Oyun akışını baştan sona anlatın"**
```
1. Player1 creates room (POST /api/game/rooms/create/)
   → Room kaydı (OPEN)

2. Player2 joins room (POST /api/game/rooms/5/join/)
   → Room status: FULL

3. Her iki oyuncu /game/5 sayfasına gider
   → WebSocket bağlantısı (wss://backend/ws/game/5/?token=xxx)

4. Her iki oyuncu JOIN_GAME gönderir
   → Backend: 2 participant var, oyunu başlat
   → start_game():
     - Secret number üret (1-100)
     - Coin toss (first player)
     - Balance düş (her ikisinden)
     - Game kaydı oluştur
   → GAME_START broadcast (her iki oyuncuya)

5. Current player tahmin yapar (MAKE_GUESS)
   → Backend:
     - Validate (sıra, range)
     - Feedback üret (UP/DOWN/CORRECT)
     - Guess kaydı
     - CORRECT? → end_game()
     - CORRECT değil? → switch_turn()
   → TURN_UPDATE veya GAME_END broadcast

6. Oyun biter:
   → Kazanana para ver (2x bet)
   → Room ve Game status: COMPLETED
   → GAME_END broadcast
   → Frontend: refreshUser() (balance update)
```

### Debugging Sorular

**S9: "Deployment sırasında en çok hangi hatayı aldınız?"**
```
1. CORS errors:
   - Trailing slash
   - Middleware sırası
   - Frontend URL yanlış

2. Database connection:
   - DATABASE_URL backend service'e eklenmemiş
   - Railway environment detection yanlış

3. WebSocket connection failed:
   - Redis plugin yok
   - JWT token expire
   - REDIS_URL backend'e eklenmemiş

4. SSL redirect loop:
   - SECURE_PROXY_SSL_HEADER eksik

Debug araçları:
- check_env.py (environment variables)
- Railway logs
- Browser DevTools (Network, Console)
```

**S10: "Bu projeyi nasıl test edersiniz?"**
```
1. Unit Tests:
   - GameService methodları (start_game, make_guess)
   - Model validation (balance < 0 ?)
   - Serializer validation

2. Integration Tests:
   - API endpoints (create room, join room)
   - WebSocket flow (connect, join, guess)

3. Manual Tests:
   - İki tarayıcı (normal + incognito)
   - Player1: Create room
   - Player2: Join room
   - Oyunu oyna, kazanan doğru mu?
   - Balance güncellenmiş mi?

4. Edge Cases:
   - Balance yetersiz
   - Aynı user 2 kere join
   - Wrong turn tahmin
   - Network disconnect sırasında tahmin
```

---

## SONUÇ

Bu döküman, projenizin her detayını içermektedir. Mülakatta:

1. **Genel Bakış:** "2 oyunculu, WebSocket tabanlı, real-time bahis oyunu"
2. **Teknoloji Stack:** Django + React + PostgreSQL + Redis + Railway
3. **Öne Çıkan Özellikler:**
   - WebSocket ile real-time iletişim
   - JWT authentication (REST + WebSocket)
   - Race condition handling (F() + select_for_update)
   - ACID transactions (balance güvenliği)
4. **Deployment Challenges:**
   - CORS yapılandırması
   - SSL redirect loop
   - Environment variable yönetimi
5. **Mimari Kararlar:**
   - GameService (business logic separation)
   - Singleton WebSocket service
   - Context API (global state)
   - Channel layer (Redis pub/sub)

Bu dökümanı okuduktan sonra projeyi %100 anlayacaksınız. Başarılar! 🚀
