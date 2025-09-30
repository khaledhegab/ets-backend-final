# ETS Backend - Electronic Transit System

A robust Node.js/Express backend API for managing an Electronic Transit System (ETS) with real-time trip management, payment processing, and station gate operations.

## 🚀 Features

- **User Authentication**: Supabase-powered authentication with JWT tokens
- **Trip Management**: Start, track, and end transit trips with automatic fare calculation
- **Station Gate Integration**: Secure gate authentication for entry/exit operations
- **Balance Management**: Wallet system with available and holding balance separation
- **Route Finding**: Calculate optimal metro routes between stations
- **Payment Processing**: Transaction management with hold/release mechanism
- **Dynamic Pricing**: Distance-based fare calculation (Short/Medium/Long/Extended)

## 📋 Prerequisites

- Node.js >= 16.0.0
- PostgreSQL database (via Supabase)
- Supabase account with project setup

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ets-backend-final
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Station Authentication
STATION_AUTH_TOKEN=your_secure_station_token

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

4. **Database Setup**

Apply the database schema from `schema.sql` to your Supabase project. The schema includes:
- Users table with balance management
- Stations and gates
- Trips tracking
- Transactions ledger
- Ticket types with pricing tiers

## 🏃 Running the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

**Testing**:
```bash
npm test
npm run test:watch
```

**Linting**:
```bash
npm run lint
npm run lint:fix
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Register new user | No |
| POST | `/login` | User login | No |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/start-trip` | Initiate a new trip | Yes |
| POST | `/recharge-balance` | Add funds to wallet (webhook) | No |
| POST | `/find-route` | Calculate route between stations | Yes |

### Gates (`/api/gates`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/start-trip` | Start trip at entry gate | Station Token |
| POST | `/end-trip` | End trip at exit gate | Station Token |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health status |

## 🔐 Authentication

### User Authentication
Include JWT token in request headers:
```
Authorization: Bearer <your_jwt_token>
```

### Station Authentication
For gate operations, include:
```
x-station-token: <station_auth_token>
x-gate-id: <gate_id>
```

## 🏗️ Architecture

### Project Structure
```
src/
├── app.js                 # Express app configuration
├── server.js              # Server entry point
├── config/
│   └── supabase.js        # Supabase client setup
├── controllers/           # Request handlers
│   ├── auth.controller.js
│   ├── gates.controller.js
│   └── users.controller.js
├── services/              # Business logic layer
│   ├── auth.service.js
│   ├── gates.service.js
│   └── users.service.js
├── routes/                # API route definitions
│   ├── auth.route.js
│   ├── gates.route.js
│   └── users.route.js
├── middleware/            # Custom middleware
│   ├── auth.js            # User JWT authentication
│   ├── stationAuth.js     # Station gate authentication
│   ├── errorHandler.js    # Global error handler
│   └── notFound.js        # 404 handler
└── utils/                 # Utility functions
    ├── catchAsync.js      # Async error wrapper
    ├── errorHandler.js    # Custom error class
    └── metroRoutes.js     # Route calculation logic
```

### Design Patterns

- **Service-Controller Pattern**: Separation of business logic from HTTP handling
- **Dual Client Pattern**: Standard Supabase client for users, admin client for system operations
- **Centralized Error Handling**: Custom ErrorHandler class with async wrapper
- **Middleware Chain**: Validation → Authentication → Controller → Service

## 💾 Database Schema

### Key Tables

- **users**: User profiles with balance tracking (linked to Supabase Auth)
- **stations**: Metro stations with coordinates and line information
- **gates**: Entry/exit gates at each station
- **trips**: Trip records from start to end station
- **transactions**: Financial transaction ledger
- **ticket_type**: Fare pricing based on distance tiers

### Pricing Tiers

| Type | Stations | Price (EGP) |
|------|----------|-------------|
| Short Distance | 1-9 | 8.00 |
| Medium Distance | 10-16 | 10.00 |
| Long Distance | 17-23 | 15.00 |
| Extended Distance | 24+ | 20.00 |

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **JWT Token Validation**: Supabase Auth integration
- **Request Validation**: express-validator for input sanitization
- **CORS Protection**: Configurable allowed origins
- **Rate Limiting**: Protection against abuse (100 req/15min)
- **Helmet.js**: Security headers (if configured)

## 🚦 Trip Lifecycle

1. **User starts trip** → System holds estimated fare from balance
2. **User travels** → Trip remains active
3. **User exits at gate** → System calculates actual fare
4. **Payment finalized** → Excess amount released back to balance

## 🧪 Testing

The project uses Jest for testing with Supabase mocking:
- Unit tests for services
- Integration tests for controllers
- Mock setup in `tests/setup.js`

## 📦 Docker Support

Build and run with Docker:
```bash
docker build -t ets-backend .
docker run -p 3000:3000 --env-file .env ets-backend
```

## 🤝 Contributing

1. Follow ESLint configuration (Airbnb base style)
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commits

## 📝 License

ISC

## 👥 Authors

ETS Development Team

---

**Note**: This system manages real financial transactions. Ensure proper security audits before production deployment.
