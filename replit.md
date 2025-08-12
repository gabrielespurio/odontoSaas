# OdontoSync - Sistema de Gestão Odontológica

## Overview
OdontoSync is a comprehensive dental clinic management SaaS system. It is a full-stack web application designed to streamline operations and enhance efficiency for dental practices. Key capabilities include patient management, appointment scheduling, clinical record-keeping, financial tracking, and reporting. The system aims to provide a robust solution for managing all aspects of a dental clinic.

## Recent Changes (January 2025)
- **Environment Variables Configuration (January 12, 2025)**: COMPLETED secure environment setup
  - **Issue**: Missing .env file causing production deployment problems and security concerns
  - **Solution**: Configured JWT_SECRET, DATABASE_URL, SESSION_SECRET as secure Replit secrets
  - **Security**: All sensitive data now properly stored as environment variables
  - **Production Impact**: Enables secure authentication and database connections on Contabo VPS
  - **Status**: ✅ Environment variables configured, ✅ Server restarted, ✅ Production ready
- **Contabo Production Layout Fix (January 12, 2025)**: RESOLVED layout breaking issues on Contabo VPS production
  - **Issue**: Complete layout breakdown with missing CSS/JS - only login form visible without styling
  - **Root Cause**: Missing environment variables, production server not serving static files correctly, missing build step
  - **Solution**: Created production-contabo-fixed.js with proper environment variables and static file handling
  - **Files**: production-contabo-fixed.js, contabo-deploy-final.md
  - **Critical Steps**: 1) Configure .env with proper variables, 2) Run "npm run build", 3) Use production server

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (with HMR)
- **UI**: Radix UI components integrated with shadcn/ui
- **Styling**: Tailwind CSS, utilizing custom dental-specific color themes
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod for validation
- **Design Philosophy**: Mobile-first responsive design, intuitive UI/UX with a consistent color scheme (teal dominant).

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: PostgreSQL (connected via Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: JWT-based with bcrypt for password hashing
- **API Design**: RESTful API with structured error handling
- **Session Management**: PostgreSQL-based session storage

### Database
- **Primary Database**: PostgreSQL (Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Data Modeling**: Relational design, utilizing foreign keys and PostgreSQL enums
- **Multi-Tenancy**: Company-based data isolation implemented through a `company_id` column across core tables.

### Key Features and Design Decisions
- **Patient Management**: Comprehensive registry, medical history (anamnese) with structured schemas, clinical notes, and document management.
- **Dental Chart (Odontogram)**: Interactive visual chart using FDI numbering to track conditions and treatment history.
- **Appointment Management**: Multi-view calendar with status tracking, resource management (dentist-specific), and real-time conflict validation considering procedure duration and multi-tenancy.
- **Clinical Documentation**: Detailed consultation records, treatment planning, and seamless integration with appointments and patients, including automatic sequential attendance numbering.
- **Financial Management**: Integrated receivables, payables, and cash flow tracking, supporting multiple payment methods and financial reporting with data scope control.
- **User Management & Authentication**: Role-based access (Admin, Dentist, Receptionist) with JWT authentication, including forced password change, user profiles for access control, and granular data scope control.
- **Access Control**: Module-based access control (`use-permissions` hook, `ProtectedRoute`) and data-level access control via `dataScope` field for users.
- **Automation**: Automatic WhatsApp notifications for new appointments and daily reminders.
- **Reporting**: Comprehensive reports for overview, financial, appointments, and procedures, with data scope control and CSV export.
- **UX Improvements**: ViaCEP API integration for address auto-completion, dynamic UI elements, and improved table actions.
- **Error Handling**: Robust error handling across frontend and backend, including specific messages for conflicts and validation issues.
- **State Management Strategy**: Combination of TanStack Query for server state, local React state for UI updates, and an aggressive cache invalidation strategy.

## External Dependencies

- **@neondatabase/serverless**: For PostgreSQL serverless connection.
- **drizzle-orm**: ORM for database interactions.
- **@tanstack/react-query**: For server state management in the frontend.
- **@radix-ui/***: Headless UI components.
- **react-hook-form**: For form management.
- **zod**: For runtime type validation.
- **bcrypt**: For password hashing.
- **jsonwebtoken**: For JWT token management.
- **tailwindcss**: Utility-first CSS framework.
- **vite**: Frontend build tool and development server.
- **node-cron**: For scheduling automated tasks.
- **Evolution API**: For WhatsApp integration.
- **ViaCEP API**: For automatic address completion.