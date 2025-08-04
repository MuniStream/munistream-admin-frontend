# MuniStream Frontend - Admin Dashboard

A comprehensive React-based administrative dashboard for managing MuniStream workflows, citizens, and documents.

## Features

### ✅ Implemented
- **Dashboard Layout** with navigation and Material-UI theming
- **Workflow Management** dashboard with workflow cards and step details
- **Interactive Workflow Diagrams** using Mermaid.js for DAG visualization
- **Real-time Data** with React Query for API state management
- **Performance Metrics** integration with backend APIs
- **Responsive Design** optimized for desktop and mobile

### 🚧 In Development
- **Citizen Instance Tracking** - Real-time workflow progress monitoring
- **Administrator Inbox** - Pending approvals, document reviews, signatures
- **Document Management** - Verification dashboard with AI confidence scores
- **Performance Analytics** - Comprehensive bottleneck analysis and metrics
- **Real-time Notifications** - WebSocket integration for live updates
- **Role-based Access Control** - Authentication and authorization system

## Tech Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for professional admin interface
- **React Router** for navigation
- **React Query** for server state management
- **Mermaid.js** for workflow diagram visualization
- **Vite** for fast development and building
- **Axios** for API communication

## Getting Started

### Prerequisites
- **Docker & Docker Compose** (recommended)
- OR Node.js 18+ and npm (for local development)
- MuniStream backend running

### 🐳 Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/MuniStream/munistream-admin-frontend.git
cd munistream-admin-frontend

# Copy environment variables
cp .env.example .env

# Start development environment
npm run docker:dev

# OR start production environment
npm run docker:prod
```

### 💻 Local Development Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build
```

### 🐳 Docker Commands

```bash
# Build development image
npm run docker:build-dev

# Build production image
npm run docker:build-prod

# Start development container
npm run docker:dev

# Start production container
npm run docker:prod

# Full stack with backend
docker-compose up
```

### 🌐 Access Points
- **Development**: http://localhost:3000
- **Production**: http://localhost:80
- **Backend API**: http://localhost:8000/api/v1
- **API Documentation**: http://localhost:8000/docs

## Key Features

### 1. Workflow Visualization
- Interactive DAG diagrams with real-time step status
- Color-coded step types (Action, Approval, Document, etc.)
- Click-through navigation to detailed analytics

### 2. Performance Monitoring
- Real-time workflow statistics
- Bottleneck identification and analysis
- Step-by-step performance metrics
- Success rate and completion time tracking

### 3. Admin Dashboard
- Quick overview of system status
- Active citizen counts and processing metrics
- Recent activity and pending tasks
- System-wide efficiency indicators

### 4. Responsive Design
- Mobile-friendly admin interface
- Sidebar navigation with badge notifications
- Professional Material-UI components
- Dark/light theme support

## Project Structure

```
src/
├── components/          # Reusable UI components
├── layouts/            # Page layouts
├── pages/              # Main pages
├── services/           # API service layer
├── types/              # TypeScript type definitions
├── routes/             # Application routing
└── App.tsx             # Root application component
```
