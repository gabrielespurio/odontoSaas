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
- July 08, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment
- July 08, 2025. PATIENT MODULE IMPROVEMENT: Removed "Visualizar" option from patient actions dropdown
- July 08, 2025. Updated patient actions to only show "Editar" and "Excluir" options
- July 08, 2025. Modified "Editar" button to navigate to patient detail page with odontogram, history, and financial information
- July 08, 2025. SCHEDULING MODULE ENHANCEMENT: Improved appointment booking system with multiple procedure selection
- July 08, 2025. Added pre-filling of date and time when clicking "Reserve Time" buttons in schedule
- July 08, 2025. Implemented multiple procedure selection with checkboxes instead of single dropdown
- July 08, 2025. Added automatic calculation of total duration and price for selected procedures
- July 08, 2025. Enhanced appointment summary with detailed procedure breakdown and total values
- July 08, 2025. Successfully migrated project from Replit Agent to standard Replit environment
- July 08, 2025. Fixed database connection issues and created new PostgreSQL database
- July 08, 2025. Improved patient module actions: removed "Visualizar" option, "Editar" now navigates to patient detail page
- July 08, 2025. AUTHENTICATION SYSTEM FIXES: Implemented robust login redirection using window.location.href
- July 08, 2025. Fixed logout functionality to properly clear authentication state and redirect to login page
- July 08, 2025. Enhanced authentication flow with forced redirection to prevent login/logout navigation issues
- July 08, 2025. SCHEDULING MODULE IMPROVEMENTS: Fixed layout spacing and button positioning in schedule page
- July 08, 2025. Improved schedule header with proper spacing between title and "Novo Agendamento" button
- July 08, 2025. Repositioned new appointment button to the right side of the screen with proper margins
- July 08, 2025. STICKY HEADER IMPLEMENTATION: Added sticky header to schedule grid showing days of the week
- July 08, 2025. Enhanced schedule UX with fixed header that remains visible during vertical scrolling
- July 08, 2025. Added sticky time column for better navigation and orientation within schedule grid
- July 08, 2025. COLUMN ALIGNMENT FIX: Fixed header and body column alignment by adjusting padding for scrollbar space
- July 08, 2025. Implemented proper grid alignment compensation for vertical scrollbar in schedule view
- July 08, 2025. DEFINITIVE ALIGNMENT SOLUTION: Replaced CSS Grid with HTML table structure for perfect column alignment
- July 08, 2025. Implemented table-fixed layout with colgroup to ensure identical column widths in header and body
- July 08, 2025. Fixed sticky header alignment issue permanently using table structure with matching column definitions
- July 08, 2025. FINAL ALIGNMENT FIX: Replaced table structure with flexbox layout using fixed width time column and flex-1 day columns
- July 08, 2025. Added scrollbar compensation with marginRight to header for perfect visual alignment
- July 08, 2025. SCHEDULE DURATION FIX: Implemented proper appointment duration display based on procedure duration
- July 08, 2025. Added logic to show appointments spanning multiple time slots (30-minute intervals)
- July 08, 2025. Appointments now visually occupy the correct amount of time with height scaling and continuation indicators
- July 08, 2025. **AUTHENTICATION FIXES**: Fixed login redirection issue - users now automatically redirect to dashboard after successful login
- July 08, 2025. **LOGOUT IMPROVEMENT**: Fixed logout functionality to properly clear session and redirect to login page
- July 08, 2025. Enhanced authentication flow with robust state management and proper redirections
- July 08, 2025. **SCHEDULE MODULE FIXES**: Fixed appointment duration display - procedures now correctly occupy multiple time slots based on their duration
- July 08, 2025. **TIMEZONE CORRECTIONS**: Fixed timezone issues in appointment display - appointment times now show correctly in schedule view
- July 08, 2025. Improved appointment slot calculation to properly handle multi-slot procedures (e.g., 1-hour appointments spanning 2 slots)
- July 08, 2025. Enhanced date comparison logic to avoid timezone conversion issues between form input and schedule display
- July 08, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment
- July 08, 2025. **APPOINTMENT FORM IMPROVEMENTS**: Fixed dropdown field cutoff issue in appointment booking form
- July 08, 2025. Enhanced Select component positioning with popper strategy to prevent overflow within dialog containers
- July 08, 2025. Improved dialog container sizing and overflow handling for better user experience
- July 08, 2025. **MODAL SIZE OPTIMIZATION**: Increased appointment form modal width from max-w-2xl to max-w-4xl for better dropdown visibility
- July 08, 2025. Enhanced dropdown positioning with z-50 and align="start" properties for proper rendering
- July 08, 2025. **TIMEZONE ISSUE FIXED**: Definitively resolved timezone problems in appointment scheduling
- July 08, 2025. Implemented proper timezone handling for Brazilian timezone (-3 UTC) in both frontend and backend
- July 08, 2025. Fixed appointment time display to show correct local time instead of UTC converted time
- July 08, 2025. **APPOINTMENT CONFLICT VALIDATION**: Added validation to prevent double-booking of appointment slots
- July 08, 2025. Implemented backend validation to check for time conflicts before creating/updating appointments
- July 08, 2025. Enhanced error handling to display specific conflict messages to users
- July 08, 2025. **INTUITIVE CONFLICT VALIDATION**: Improved UX for appointment conflicts with real-time validation
- July 08, 2025. Added visual feedback with red border and inline error message for time conflicts
- July 08, 2025. Implemented client-side validation that prevents form submission when conflicts are detected
- July 08, 2025. **PROCEDURE DURATION VALIDATION**: Enhanced conflict detection to consider procedure duration
- July 08, 2025. System now blocks time slots during entire procedure duration (e.g., 90min procedure blocks 1.5 hours)
- July 08, 2025. Improved error messages to show exact conflict times and procedure names
- July 08, 2025. **DENTIST SELECTION FIX**: Fixed dentist selection dropdown to show only users with dentist role
- July 08, 2025. Updated appointment form to use dedicated /api/users/dentists endpoint instead of filtering all users
- July 08, 2025. **SCHEDULE FILTER FIX**: Fixed schedule page dentist filter to use /api/users/dentists endpoint
- July 08, 2025. Schedule page now only shows dentists in filter dropdown, removing admin and reception users
- July 08, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment
- July 08, 2025. **APPOINTMENT FORM IMPROVEMENTS**: Fixed dropdown cutting issue in appointment form - increased dialog height, added dropdown height limits, improved overflow handling
- July 08, 2025. **DATABASE CONNECTION FIXED**: Successfully ensured only the specified Neon database connection is used
- July 08, 2025. **PROCEDURE CATEGORIES ISSUE RESOLVED**: Fixed missing procedure_categories table by creating all required database tables
- July 08, 2025. **CATEGORY MANAGEMENT WORKING**: Procedure categories can now be created and managed successfully through the configuration interface
- July 08, 2025. **EXCLUSIVE DATABASE CONNECTION**: Configured system to use only the specified Neon database connection
- July 08, 2025. Removed all alternative database connections to ensure data consistency
- July 08, 2025. Forced connection to: postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb
- July 08, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment with exclusive Neon database connection
- July 08, 2025. **PROCEDURES MODULE INTEGRATION**: Successfully integrated procedures module with dynamic category loading from API
- July 08, 2025. **CATEGORY INTEGRATION**: Procedure creation and filtering now uses categories from configuration module
- July 08, 2025. **DYNAMIC COLORS**: Implemented dynamic color generation for procedure categories based on category names
- July 09, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment
- July 09, 2025. **CONSULTATIONS MODULE REDESIGN**: Converted consultations display from cards to table format with improved organization
- July 09, 2025. **TABLE IMPLEMENTATION**: Added expandable rows for clinical notes and observations in consultations table
- July 09, 2025. **IMPROVED UX**: Enhanced consultations interface with better column organization and visual hierarchy
- July 09, 2025. **CONSULTATION EDITING**: Implemented full consultation editing functionality with pre-populated form fields
- July 09, 2025. **API ENHANCEMENT**: Added PUT endpoint for updating consultations with proper validation
- July 09, 2025. **PROCEDURE LOADING FIX**: Fixed procedure loading issue in edit modal by implementing proper useEffect timing
- July 09, 2025. **TIME CONFLICT VALIDATION**: Added comprehensive time conflict validation system for consultations module
- July 09, 2025. **REAL-TIME VALIDATION**: Implemented real-time validation that monitors date, time, and dentist changes
- July 09, 2025. **VISUAL FEEDBACK**: Added red error messages and border styling when appointment conflicts are detected
- July 09, 2025. **CONFLICT PREVENTION**: System prevents form submission when time conflicts exist with existing appointments
- July 09, 2025. **APPOINTMENT STATUS ENHANCEMENT**: Improved appointment status system with Portuguese workflow states
- July 09, 2025. **STATUS WORKFLOW**: Added three appointment statuses: "agendado" (scheduled), "em_atendimento" (in progress), and "concluido" (completed)
- July 09, 2025. **VISUAL STATUS INDICATORS**: Color-coded appointment cards with status badges and dropdown actions for status changes
- July 09, 2025. **INTUITIVE STATUS MANAGEMENT**: One-click status progression from scheduled → in progress → completed with contextual actions

## User Preferences

Preferred communication style: Simple, everyday language.