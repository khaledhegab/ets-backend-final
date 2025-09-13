# ETS Backend Final

A robust Node.js backend server with Supabase integration for authentication and database operations.

## Features

- **Authentication**: Complete auth system using Supabase Auth
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Database**: Supabase PostgreSQL integration
- **API Documentation**: RESTful API endpoints
- **Testing**: Jest test suite with mocking
- **Code Quality**: ESLint configuration
- **Error Handling**: Centralized error handling middleware
- **Logging**: Morgan HTTP request logger

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd ets-backend-final
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your `.env` file with your Supabase credentials:

```env
NODE_ENV=development
PORT=3000

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Supabase Setup

1. Create a new Supabase project
2. Set up the following table in your Supabase database:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run the test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/reset-password` - Reset password
- `PUT /api/auth/update-password` - Update password

### Users

- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `DELETE /api/users/account` - Delete user account

### Protected Routes

- `GET /api/protected` - Example protected route
- `GET /api/example-data` - Example database query

### Health Check

- `GET /health` - Server health check

## Project Structure

```
src/
├── config/
│   └── supabase.js         # Supabase client configuration
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── errorHandler.js     # Error handling middleware
│   └── notFound.js         # 404 handler
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User management routes
│   └── protected.js        # Protected routes
├── services/
│   ├── authService.js      # Authentication service
│   └── userService.js      # User service
├── app.js                  # Express app configuration
└── server.js               # Server entry point

tests/
├── app.test.js             # Application tests
└── setup.js                # Test setup and mocks
```

## Security Features

- **Helmet**: Sets various HTTP headers to secure the app
- **CORS**: Configured for specific origins
- **Rate Limiting**: Prevents abuse of API endpoints
- **Input Validation**: Using express-validator
- **JWT Authentication**: Secure token-based authentication via Supabase
- **Environment Variables**: Sensitive data protection

## Testing

The project includes a comprehensive test suite using Jest. Tests include:

- Health check endpoint
- 404 error handling
- Mocked Supabase integration

Run tests with:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the ISC License.
