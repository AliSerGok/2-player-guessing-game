# 2-Player Betting Guessing Game

React + Django tabanlı iki oyunculu, gerçek zamanlı sayı tahmin oyunu platformu.

**Canlı Demo:**
- Frontend: https://splendid-youth-production-f3f7.up.railway.app
- Backend API: https://2-player-guessing-game-production.up.railway.app

## Kurulum

### Gereksinimler
- Python 3.11+
- Node.js 20+
- PostgreSQL 12+
- Redis 6+

### Backend Kurulumu

```bash
# PostgreSQL veritabanı oluştur
createdb betting_game_db

# Backend klasörüne git
cd backend

# Virtual environment oluştur ve aktifleştir
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# .env dosyası oluştur
cat > .env << EOF
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://postgres:password@localhost:5432/betting_game_db
REDIS_URL=redis://localhost:6379
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
EOF

# Database migration
python manage.py migrate

# Admin kullanıcısı oluştur (otomatik)
python manage.py create_admin
# Email: admin@gmail.com
# Password: adminadmin

# Redis başlat (yeni terminal penceresi)
redis-server

# Django server başlat
python manage.py runserver
```

### Frontend Kurulumu

```bash
# Frontend klasörüne git
cd frontend

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
EOF

# Development server başlat
npm start
```

### Erişim

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin Panel: http://localhost:3000/admin (email: admin@gmail.com, password: adminadmin)

## Mimari Yaklaşım

### Genel Mimari

Proje, frontend ve backend'in tamamen ayrıldığı **client-server** mimarisini kullanır:

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

**Modüler Yapı:**
- `apps/users/`: Kullanıcı yönetimi, authentication, wallet ve transaction işlemleri
- `apps/game/`: Oyun mantığı, oda yönetimi, bahis sistemi, WebSocket consumers

**Katmanlı Mimari:**
- **Models** (`models.py`): Database schema ve ORM modelleri
- **Serializers** (`serializers.py`): API input/output validation ve serialization
- **Views** (`views.py`): REST API endpoints (DRF ViewSets)
- **Services** (`services.py`): Business logic ve oyun kuralları
- **Consumers** (`consumers.py`): WebSocket event handling

**Teknoloji Seçimleri:**
- **Django Channels**: WebSocket desteği için ASGI uygulaması
- **Redis**: WebSocket message broadcasting için channel layer
- **PostgreSQL**: ACID transaction desteği, row-level locking
- **JWT**: Stateless authentication (REST API ve WebSocket için)

### Frontend (React)

**Component-Based Yapı:**
- `components/`: Yeniden kullanılabilir UI bileşenleri
- `contexts/`: Global state management (AuthContext)
- `services/`: API ve WebSocket iletişim katmanı

**State Management:**
- **Context API**: Global authentication state
- **Local State**: Component-level state (useState/useEffect hooks)
- **WebSocket Service**: Singleton pattern ile WebSocket connection yönetimi

### Gerçek Zamanlı İletişim

**WebSocket Mimarisi:**
- Django Channels ile ASGI-based WebSocket server
- Redis channel layer ile message broadcasting (pub/sub pattern)
- JWT authentication WebSocket bağlantısında query parameter üzerinden
- Event-driven architecture: Frontend event listener pattern kullanır

**Oyun Akışı:**
```
Player1 & Player2 → WebSocket Connect → JWT Auth
                         ↓
                    JOIN_GAME event
                         ↓
              GameService.start_game()
                         ↓
        Secret number üret, coin toss, balance düş
                         ↓
          GAME_START broadcast (her iki oyuncuya)
                         ↓
        Player → MAKE_GUESS → GameService.make_guess()
                         ↓
            Feedback üret (UP/DOWN/CORRECT)
                         ↓
         TURN_UPDATE veya GAME_END broadcast
```

### Güvenlik ve Veri Tutarlılığı

**Race Condition Önleme:**
- `select_for_update()`: Database-level row locking
- `F()` expressions: Atomic balance güncellemeleri
- `transaction.atomic()`: ACID transaction garantisi

**Authentication:**
- JWT tokens (access + refresh)
- HTTP-only token storage (localStorage)
- WebSocket authentication via query string

**CORS:**
- Sadece izin verilen origin'lerden istek kabul edilir
- Credentials support (cookies/authorization headers)

### Database Design

**İlişkisel Model:**
- User → Transaction (1:N)
- User → Room (creator, player1, player2)
- Room → Game (1:1)
- Game → Guess (1:N)
- Game → User (current_turn, winner)

**Transaction History:**
Tüm balance değişiklikleri `Transaction` tablosunda loglanır (audit trail).

## Varsayımlar

1. **Sanal Para Sistemi**: Gerçek para değil, "Gold" adlı sanal birim kullanılır. Başlangıç bakiyesi 1000 Gold.

2. **İki Oyunculu Mantık**: Her oda tam olarak 2 oyuncu alır. 1v1 oyun mantığı vardır.

3. **Tek Oyun Per Room**: Her room'da sadece 1 oyun oynanır. Oyun bittikten sonra room COMPLETED durumuna geçer ve tekrar kullanılamaz.

4. **Kazanan Hepsini Alır**: Kazanan oyuncu her iki oyuncunun bahis tutarını alır (2x bet). Kaybeden hiçbir şey kazanamaz.

5. **Sıralı Tahmin**: Oyuncular aynı anda tahmin yapamaz, sıra sistemi vardır. Her tahmin sonrası sıra otomatik olarak karşı oyuncuya geçer.

6. **Email-Based Authentication**: Username yerine email adresi ile kimlik doğrulama yapılır.

7. **Yaş Kontrolü**: Sisteme kayıt için minimum 18 yaş şartı vardır. Yaş bilgisi kayıt sırasında alınır (email doğrulama yapılmaz, kullanıcı beyanı kabul edilir).

8. **Bahis Tutarı Sabit**: Oda oluşturulurken belirlenen bahis tutarı oyun boyunca değiştirilemez.

9. **Balance Kontrolü**: Kullanıcı yeni oda oluştururken veya mevcut odaya katılırken bakiyesinin bahis tutarına yetmesi kontrol edilir.

10. **Otomatik Oyun Başlatma**: İki oyuncu da odaya katıldığında ve WebSocket'e bağlandığında oyun otomatik olarak başlar (manuel "start" butonuna gerek yoktur).

11. **Secret Number Range**: Tahmin edilecek gizli sayı her zaman 1-100 arası (inclusive) bir tam sayıdır.

12. **Coin Toss**: Oyun başlangıcında ilk sıra random coin toss ile belirlenir (adil dağılım).

## Bilerek Yapılmayanlar

Bu case study kapsamında aşağıdaki özellikler **bilinçli olarak** implement edilmemiştir:

1. **E-posta Doğrulama**: Case study dökümanında "mock kabul edilir" dendiği için gerçek email gönderimi ve doğrulama sistemi yapılmadı. Kullanıcı kayıt olduktan sonra direkt giriş yapabilir.

2. **Oyuncu Bağlantı Kopması Senaryosu**: Case study'de "Oyuncu bağlantısı koparsa basit bir senaryo ele alınmalıdır" denmiş. Şu anda bağlantı kopması durumunda oyun devam eder ama kopan oyuncu manuel refresh yapana kadar oyuna dönemez. Otomatik reconnection veya timeout mekanizması yok.

3. **Profil Sayfası**: Case study "Kullanıcı Tarafı Ekranlar" arasında "Profil ve bakiye görüntüleme" istiyor. Bakiye header'da gösteriliyor ancak ayrı bir profil sayfası yok.

---

**Not:** Proje detaylı teknik dokümantasyon için `PROJECT_DOCUMENTATION.md` dosyasına bakınız (2400+ satır mimari detay, API referansı, deployment guide).
