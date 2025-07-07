# DentalCare - Sistema de Gestão Odontológica

## Overview

DentalCare is a comprehensive dental clinic management SaaS system built as a full-stack web application. The system provides complete patient management, appointment scheduling, clinical record-keeping, financial tracking, and reporting capabilities specifically tailored for dental practices.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR (Hot Module Replacement)
- **UI Framework**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with custom dental-specific color themes
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **Development**: Replit-optimized with cartographer and runtime error modal

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM with type-safe queries
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **API Design**: RESTful API with structured error handling
- **Session Management**: PostgreSQL-based session storage

### Database Architecture
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit with migrations
- **Data Modeling**: Relational design with proper foreign key relationships
- **Enums**: PostgreSQL enums for controlled vocabularies (user roles, appointment status, etc.)

## Key Components

### 1. Patient Management System
- **Patient Registry**: Complete patient information with CPF validation
- **Medical History**: Comprehensive anamnese (medical questionnaire) system
- **Clinical Notes**: Ongoing clinical observations and documentation
- **Document Management**: Simulated file upload system

### 2. Dental Chart System (Odontogram)
- **Interactive Dental Chart**: Visual tooth-by-tooth condition tracking
- **FDI Numbering**: International dental numbering system
- **Condition Tracking**: Healthy, caries, restoration, extraction, planned/completed treatments
- **Treatment History**: Historical record of all dental procedures per tooth
- **Visual Interface**: Click-to-update dental chart with color-coded conditions

### 3. Appointment Management
- **Scheduling System**: Multi-view calendar (day/week/month)
- **Status Tracking**: Scheduled, confirmed, attended, cancelled
- **Resource Management**: Dentist-specific scheduling
- **Patient Integration**: Direct linking to patient records

### 4. Clinical Documentation
- **Consultation Records**: Detailed clinical visit documentation
- **Treatment Planning**: Procedure planning and execution tracking
- **Clinical Notes**: Ongoing patient care documentation
- **Integration**: Links consultations to appointments and patients

### 5. Financial Management
- **Payment Tracking**: Comprehensive billing and payment system
- **Status Management**: Pending, paid, overdue payment tracking
- **Payment Methods**: Multiple payment method support
- **Revenue Analytics**: Financial reporting and tracking

### 6. User Management & Authentication
- **Role-Based Access**: Admin, dentist, and receptionist roles
- **JWT Authentication**: Secure token-based authentication
- **Password Security**: Bcrypt hashing for password storage
- **Session Management**: Persistent login sessions

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Server validates credentials against database
3. JWT token generated and returned to client
4. Client stores token in localStorage
5. All subsequent API requests include Authorization header
6. Server middleware validates token on protected routes

### Patient Management Flow
1. Patient data entered through forms with validation
2. Data validated client-side using Zod schemas
3. API requests sent to Express backend
4. Drizzle ORM processes database operations
5. Real-time updates via TanStack Query cache invalidation

### Dental Chart Flow
1. Interactive dental chart displays current tooth conditions
2. User clicks on teeth to update conditions
3. Changes immediately reflected in UI
4. Background API calls update database
5. Historical tracking maintained per tooth

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **react-hook-form**: Form management
- **zod**: Runtime type validation
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT token management

### Development Dependencies
- **@replit/vite-plugin-***: Replit-specific development tools
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type checking and compilation
- **vite**: Build tool and development server

## Deployment Strategy

### Development Environment
- **Replit Integration**: Optimized for Replit development environment
- **Hot Reload**: Vite HMR for rapid development
- **Error Handling**: Runtime error modal for debugging
- **Cartographer**: Replit-specific development tools

### Production Build
- **Frontend**: Vite build process generates optimized static assets
- **Backend**: ESBuild bundles server code for production
- **Database**: Drizzle migrations for schema deployment
- **Environment**: Environment variable based configuration

### Database Deployment
- **Migrations**: Drizzle Kit manages database schema changes
- **Connection**: Neon serverless PostgreSQL for scalability
- **Environment**: DATABASE_URL environment variable required

## Changelog

- July 07, 2025. Initial setup
- July 07, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment
- July 07, 2025. Color scheme updated from blue to teal (#00796B) throughout the application
- July 07, 2025. Improved responsive layout and design for patient management module
- July 07, 2025. Enhanced patient table with better dropdown actions and improved typography
- July 07, 2025. Optimized patient details page with better information layout and responsive design
- July 07, 2025. Successfully migrated project from Replit Agent to standard Replit environment
- July 07, 2025. Configured Neon PostgreSQL database connection: ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech
- July 07, 2025. Created admin user (username: admin, password: admin123) for system access
- July 07, 2025. Removed all conflicting database connections to ensure single Neon database usage
- July 07, 2025. Fixed authentication flow and navigation redirection issues
- July 07, 2025. Populated database with sample patients and procedures for testing
- July 07, 2025. Verified API endpoints returning correct data from Neon database
- July 07, 2025. Completely redesigned odontogram interface with modern layout and improved UX
- July 07, 2025. Moved tooth editing forms from sidebar to bottom of page for better workflow
- July 07, 2025. Optimized layout to fit within screen bounds with proper scroll functionality
- July 07, 2025. Enhanced dental chart with better hover effects and visual feedback
- July 07, 2025. Successfully migrated project from Replit Agent to standard Replit environment
- July 07, 2025. Configured PostgreSQL database connection with Neon serverless database
- July 07, 2025. Created admin user (username: admin, password: admin123) for system access
- July 07, 2025. Migration completed: All dependencies installed, database schema applied, sample data populated
- July 07, 2025. Successfully connected to specific Neon database: ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech
- July 07, 2025. Modified server/db.ts to force connection to user-specified Neon database
- July 07, 2025. Authentication system fully functional with admin user access
- July 07, 2025. Database populated with sample patients and procedures for testing
- July 07, 2025. Fixed layout and scroll issues throughout the application
- July 07, 2025. Improved responsive design for dental chart and patient detail pages
- July 07, 2025. Enhanced odontogram interface with better mobile layout and scroll behavior
- July 07, 2025. Added proper padding and responsive table classes to prevent content cutoff
- July 07, 2025. Implemented smooth scroll behavior and enhanced mobile responsiveness across all pages
- July 07, 2025. Fixed definitive scroll issues in odontogram with proper container height and padding
- July 07, 2025. Implemented responsive viewport-based height calculations for optimal display
- July 07, 2025. Added custom scrollbar styling for better user experience in dental chart
- July 07, 2025. Enhanced dental chart history section with elegant card design showing conditions, dates, and observations
- July 07, 2025. Fixed dental chart to maintain complete history (last 5 records) instead of overwriting previous conditions
- July 07, 2025. Implemented proper chronological tracking of all tooth treatments and conditions
- July 07, 2025. Fixed login redirection issue - implemented automatic redirection to dashboard after successful authentication
- July 07, 2025. Enhanced authentication flow with proper state management and navigation handling
- July 07, 2025. DESIGN IMPROVEMENT: Eliminated white gap at bottom of pages by implementing consistent page-container class
- July 07, 2025. Applied full-height background to all main pages ensuring seamless visual experience

## User Preferences

Preferred communication style: Simple, everyday language.