# Geosoft Service

A Node.js backend service for Geosoft applications including Timetablely, DocxIQ, and LinkShyft.

## Overview

This service provides a unified backend API for multiple Geosoft applications with AI-powered features using Google's Gemini API. Each application has its own dedicated AI context and API key for optimized responses.

## Features

- **Multi-App Support**: Unified backend for Timetablely, DocxIQ, and LinkShyft
- **AI Integration**: Google Gemini API integration with app-specific contexts
- **Authentication**: JWT-based authentication with Google OAuth support
- **Analytics**: Built-in analytics tracking
- **Cloud Storage**: Cloudinary integration for file uploads
- **Type Safety**: Full TypeScript support

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **AI**: Google Gemini API
- **Authentication**: JWT + Google OAuth
- **Storage**: Cloudinary
- **Development**: Nodemon, Husky

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server
PORT=4000

# Database
MONGO_URI=your_mongodb_uri
MONGO_PROD_URI=your_production_mongodb_uri

# JWT
JWT_SECRET=your_jwt_secret
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_RESET_EXPIRY=1h
JWT_VERIFICATION_EXPIRY=24h

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=your_redirect_uri

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Service (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# Frontend URLs (for password reset links)
FRONTEND_URL=http://localhost:5173

# Gemini API Keys (one per app)
TIMETABLELY_GEMINI_API_KEY=your_timetablely_key
DOCXIQ_GEMINI_API_KEY=your_docxiq_key
LINKSHYFT_GEMINI_API_KEY=your_linkshyft_key

# Security
BCRYPT_ROUND=10
SALT_ROUNDS=10
SESSION_SECRET=your_session_secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Development

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Format code
pnpm format:fix
```

## API Documentation

### Base URL

```
http://localhost:4000/api/v1
```

### Health Check

```http
GET /health-check
```

Returns service status.

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Google OAuth
```http
GET /auth/google
```

### AI Endpoints

#### Generate AI Response

```http
POST /ai/generate
Content-Type: application/json

{
  "appType": "timetablely",
  "userPrompt": "Create a timetable for 5 classes",
  "includeCapabilities": true,
  "additionalContext": "School operates Monday to Friday"
}
```

**App Types:**
- `timetablely` - Timetable management
- `docxiq` - Document intelligence
- `linkshyft` - Link management

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "AI response generated successfully",
  "data": {
    "response": "...",
    "appType": "timetablely"
  }
}
```

#### Get App Information

```http
GET /ai/app/:appType
```

Returns app-specific instructions, context, and capabilities.

**Example:**
```http
GET /ai/app/timetablely
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "App information retrieved successfully",
  "data": {
    "appType": "timetablely",
    "instructions": "...",
    "context": "...",
    "capabilities": [...]
  }
}
```

### Analytics

```http
GET /analytics/visits
GET /analytics/history
```

## Project Structure

```
service/
├── src/
│   ├── config/          # Configuration files
│   │   ├── constants.ts
│   │   ├── db.ts
│   │   └── cloudinary.ts
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── prompt.controller.ts
│   │   └── analytics.controller.ts
│   ├── helpers/         # Helper functions
│   │   ├── prompt.ts
│   │   ├── response.ts
│   │   └── api.error.ts
│   ├── interfaces/      # TypeScript interfaces
│   ├── middlewares/     # Express middlewares
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/          # Database models
│   │   ├── user.model.ts
│   │   └── visit.model.ts
│   ├── routes/          # API routes
│   │   ├── index.ts
│   │   ├── auth.route.ts
│   │   ├── ai.route.ts
│   │   └── analytics.route.ts
│   ├── services/        # Business logic
│   │   ├── gemini.service.ts
│   │   ├── jwt.service.ts
│   │   └── google.service.ts
│   └── index.ts         # Entry point
├── types/               # Type definitions
├── docs/                # Documentation
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## AI Integration

The service uses Google's Gemini API with app-specific configurations:

### Timetablely
- Specialized in timetable and schedule management
- Handles course scheduling, teacher allocation, conflict detection
- Optimizes academic timetables

### DocxIQ
- Document intelligence and processing
- Content extraction, format conversion
- Intelligent document search and analysis

### LinkShyft
- Link management and URL shortening
- QR code generation
- Link analytics and tracking

Each app uses its own Gemini API key for isolated usage tracking and billing.

## Error Handling

The service uses a centralized error handling system:

```typescript
throw new APIError({
  status: 400,
  message: "Error message",
  isPublic: true,
  errorData: { /* additional data */ }
});
```

## Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Environment variable protection
- API key isolation per app

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm format` - Check code formatting
- `pnpm format:fix` - Fix code formatting
- `pnpm commit-config` - Configure git commits

## License

ISC

## Author

Milton Black

## Repository

[https://github.com/GEOSOFT-GLOBAL/geosoft-service](https://github.com/GEOSOFT-GLOBAL/geosoft-service)

## Support

For issues and questions, please open an issue on GitHub.
