# Project Documentation

## Overview

This is a React-based web application built with Vite, TypeScript, and Firebase. The application features user authentication, a dashboard, chat functionality, and various administrative features.

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript/JavaScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase
- **Routing**: React Router DOM v7
- **PDF Generation**: @react-pdf/renderer, jspdf
- **Data Parsing**: PapaParse
- **UI Components**:
  - Lucide React (Icons)
  - React Icons
  - React Slick (Carousel)

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── admin/         # Admin-specific components
│   ├── animations/    # Animation components
│   ├── auth/          # Authentication components
│   ├── chat/          # Chat-related components
│   ├── common/        # Common UI components
│   ├── dashboard/     # Dashboard components
│   ├── layout/        # Layout components
│   ├── payouts/       # Payout-related components
│   ├── sessions/      # Session management components
│   └── audit/         # Audit-related components
├── context/           # React context providers
├── firebase/          # Firebase configuration and utilities
├── pages/             # Page components
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── data/              # Static data and constants
```

## Key Features

### Authentication

- User registration and login
- Protected routes
- Firebase authentication integration

### Dashboard

- Main user interface after login
- Protected route access
- User-specific content

### Chat System

- Real-time chat functionality
- Chat assistant integration
- Message history

### Admin Features

- Administrative dashboard
- User management
- System monitoring

### Session Management

- Session tracking
- Session history
- Session analytics

### Payout System

- Payment processing
- Transaction history
- Payout management

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Development

To start the development server:

```bash
npm run dev
# or
yarn dev
```

### Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
# or
yarn preview
```

## Available Scripts

- `dev`: Start development server
- `build`: Create production build
- `preview`: Preview production build
- `lint`: Run ESLint for code linting

## Environment Setup

The application requires Firebase configuration. Create a `.env` file in the root directory with the following variables:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Code Style

The project uses ESLint for code linting. Run the linter using:

```bash
npm run lint
# or
yarn lint
```

## Dependencies

- React 18.3.1
- React Router DOM 7.6.0
- Firebase 10.8.1
- Tailwind CSS 3.4.1
- And other dependencies as listed in package.json

## Browser Support

The application is built with modern web technologies and supports:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Security

- All sensitive routes are protected
- Firebase authentication is implemented
- Environment variables are used for sensitive data

## Performance

- Code splitting is implemented
- Lazy loading for routes
- Optimized asset loading

## Support

For support and questions, please create an issue in the repository.
