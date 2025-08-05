# CivicStream Admin Frontend Context

## Current Status (Last Updated: 2025-07-14)

### Project Overview
CivicStream Admin Frontend is the administrative interface for the CivicStream workflow automation platform. Built with React 18, TypeScript, and Material-UI v7.

- **Repository**: https://github.com/paw-ml/civicstream-admin-frontend
- **Technology**: React 18 + TypeScript + Material-UI v7
- **Container**: Fully containerized with Docker + Nginx

### Completed Features
1. ✅ Complete authentication system with JWT tokens
2. ✅ Admin dashboard with workflow overview
3. ✅ Document verification system with AI analysis  
4. ✅ Workflow visualization with Mermaid.js
5. ✅ Admin inbox for approvals and reviews
6. ✅ Instance tracking and monitoring
7. ✅ Performance analytics dashboard
8. ✅ Responsive design with Material-UI components

### Current Task (Last Updated: 2025-07-14)
Preparing for citizen instance validation and approval interface implementation.

### Tomorrow's Priorities
1. 🔴 HIGH: Add Citizen Instance Validation & Approval Interface (Frontend Issue #7)
   - Create CitizenInstanceList component for pending validations
   - Add CitizenDataViewer to display submitted data
   - Implement ValidationActions for approve/reject functionality
   - Add InstanceDetailView with full submission history
   - Create ApprovalDialog for admin decision workflow
2. 🟡 MEDIUM: Add Real-time Notifications for new citizen submissions
3. 🟡 MEDIUM: Create User Management Interface

### Development Commands
```bash
# Admin Frontend
cd /Users/paw/Projects/CivicStream/civicstream-admin-frontend
docker-compose up

# Access
Frontend: http://localhost:3000
```

### Test Users
- admin / admin123 (Admin role - all permissions)
- manager / manager123 (Manager role)
- reviewer / reviewer123 (Reviewer role)
- approver / approver123 (Approver role)

### Key Technical Decisions
- Material-UI v7 for component library
- React Query for data fetching and caching
- TypeScript for type safety
- Docker containerization
- JWT authentication integration
- Mermaid.js for workflow visualization

### Development Standards
1. **Use Material-UI Components** - Always use MUI components for consistency
2. **TypeScript Strict Mode** - All components must be properly typed
3. **React Query** - Use for all API calls and data management
4. **Component Organization** - Keep components modular and reusable
5. **Responsive Design** - All interfaces must work on desktop and tablet
6. **Authentication Required** - All admin routes must be protected
7. **Error Handling** - Proper error boundaries and user feedback
8. **Testing** - Unit tests for critical components
9. **Never Commit CLAUDE.md** - NEVER commit CLAUDE.md files to any repository

### Dependencies
- Requires backend API endpoints for citizen validation features
- Integration with civicstream-workflow repository APIs