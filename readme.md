# Queue Management System

A full-stack queue management application built with Express.js, PostgreSQL, Redis, and Socket.io for real-time updates.

## Overview

This is a comprehensive queue management system designed to handle customer queues efficiently. It features real-time updates, user authentication, admin dashboard, and QR code generation for queue tickets.

## Features

- **User Authentication**: Secure JWT-based authentication system with role-based access control
- **Queue Management**: Create, join, and manage queues in real-time
- **Admin Dashboard**: Comprehensive admin panel for queue and user management
- **Real-time Updates**: Socket.io integration for live queue status updates
- **QR Code Generation**: Automatic QR code generation for queue tickets
- **Redis Caching**: High-performance caching layer for improved performance
- **Database Migrations**: Automated database schema management
- **Analytics**: Track queue metrics and analytics

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time Communication**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator
- **Logging**: Winston

### Frontend
- **HTML5**
- **CSS3**
- **JavaScript**
- **Static HTML pages** (Dashboard, Admin Panel, Login, Registration)

## Project Structure

```
queue/
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── server.ts       # Main server entry point
│   │   ├── config/         # Configuration files
│   │   │   ├── database.ts # PostgreSQL connection
│   │   │   └── redis.ts    # Redis connection
│   │   ├── controllers/    # Route controllers
│   │   │   ├── authController.ts
│   │   │   ├── queueController.ts
│   │   │   └── adminController.ts
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── package.json        # Node dependencies
│   ├── tsconfig.json       # TypeScript configuration
│   └── nodemon.json        # Development watch configuration
│
├── frontend/               # Static frontend files
│   ├── index.html          # Home page
│   ├── dashboard.html      # User dashboard
│   ├── admin.html          # Admin panel
│   ├── register.html       # Registration page
│   ├── staff-login.html    # Staff login page
│   ├── css/
│   └── js/
│
├── database/               # Database configuration
│   ├── migrations/         # SQL schema migrations
│   └── seeds/              # Initial seed data
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)
- npm or yarn or bun

## Installation

### 1. Clone and Setup

```bash
cd queue
npm install --prefix backend
```

### 2. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/queue_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
```

### 3. Database Setup

```bash
cd backend

# Run migrations
npm run migrate

# Seed initial data
npm run seed

# Verify database
npm run verify
```

### 4. Create Admin User

```bash
npm run create-admin
```

## Running the Application

### Development

```bash
cd backend
npm run dev
```

The server will start on `http://localhost:3000` with auto-reload enabled via nodemon.

### Production Build

```bash
cd backend
npm run build
npm start
```

## API Endpoints

### Authentication Routes (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /verify` - Verify authentication token

### Queue Routes (`/api/v1/queue`)
- `GET /` - Get all queues
- `POST /` - Create new queue
- `GET /:id` - Get queue details
- `POST /:id/join` - Join a queue
- `POST /:id/leave` - Leave a queue
- `GET /:id/status` - Get queue status

### Admin Routes (`/api/v1/admin`)
- `GET /users` - List all users
- `GET /queues` - List all queues
- `POST /queues/:id/process` - Process queue
- `DELETE /users/:id` - Delete user

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed database with initial data |
| `npm run verify` | Verify database connection |
| `npm run create-admin` | Create admin user |
| `npm test` | Run tests |

## Frontend

The frontend consists of static HTML pages served separately. Access them at:

- **Home Page**: `index.html`
- **User Dashboard**: `dashboard.html`
- **Admin Panel**: `admin.html`
- **Registration**: `register.html`
- **Staff Login**: `staff-login.html`

## Database

### Migrations

Database schema is managed through migrations in `database/migrations/`. Run migrations with:

```bash
npm run migrate
```

### Seeds

Initial data can be seeded with:

```bash
npm run seed
```

## Docker

Build and run with Docker:

```bash
# Development
docker build -f Dockerfile -t queue-app:dev .
docker run -p 3000:3000 queue-app:dev

# Production
docker build -f Dockerfile.prod -t queue-app:latest .
docker run -p 3000:3000 queue-app:latest
```

## Testing

Run the test suite:

```bash
npm test
```

## Health Check

The application provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-21T10:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## Logging

Application logs are handled by Winston logger. Logs include:
- Request method and path
- Error tracking
- Service status monitoring

## Security Features

- JWT-based authentication
- bcrypt password hashing
- CORS configuration
- Input validation with express-validator
- Environment-based configuration

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Run `npm run verify` to test connection

### Redis Connection Issues
- Verify Redis is running
- Check REDIS_URL in `.env`

### Port Already in Use
- Change `PORT` in `.env`
- Or kill the process using the port

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions, please open an issue in the repository.