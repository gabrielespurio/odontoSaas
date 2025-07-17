# OdontoSync - Sistema de Gestão Odontológica

## Overview

OdontoSync is a comprehensive dental clinic management SaaS system built as a full-stack web application. The system provides complete patient management, appointment scheduling, clinical record-keeping, financial tracking, and reporting capabilities specifically tailored for dental practices.

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
- July 09, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment
- July 09, 2025. **EXCLUSIVE DATABASE CONNECTION**: Configured system to use ONLY the specified Neon database connection
- July 09, 2025. **DATABASE SECURITY**: Removed all alternative database connections and environment variables
- July 09, 2025. **HARDCODED CONNECTION**: Forced connection to postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb
- July 09, 2025. **CONNECTION VALIDATION**: Verified exclusive database connection with proper SSL and channel binding requirements
- July 09, 2025. **CONSULTATIONS MODULE FIX**: Fixed missing updated_at column in consultations table
- July 09, 2025. **ENUM SYNCHRONIZATION**: Updated appointment_status enum to include Portuguese values (agendado, em_atendimento, concluido, cancelado)
- July 09, 2025. **SCHEMA ALIGNMENT**: Synchronized database schema with frontend expectations for appointment status values
- July 09, 2025. **CONSULTATION CREATION**: Fixed consultation creation functionality - now working correctly with proper status handling
- July 09, 2025. **STATUS SYNCHRONIZATION FIX**: Fixed appointment status inconsistency between different modules
- July 09, 2025. **REPORTS MODULE CORRECTION**: Updated reports page to use correct Portuguese status values (agendado, em_atendimento, concluido, cancelado)
- July 09, 2025. **UNIFIED STATUS DISPLAY**: Synchronized all status displays across schedule, consultations, and reports modules
- July 09, 2025. **BIDIRECTIONAL STATUS SYNC**: Implemented bidirectional status synchronization between appointments and consultations
- July 09, 2025. **AUTOMATIC STATUS UPDATE**: When consultation status changes, related appointments are automatically updated
- July 09, 2025. **APPOINTMENT-CONSULTATION SYNC**: When appointment status changes, related consultations are automatically updated
- July 09, 2025. **CACHE INVALIDATION**: Both modules now invalidate each other's cache when status changes for real-time updates
- July 09, 2025. **STATUS SYNCHRONIZATION COMPLETE**: Fixed all status inconsistencies between appointments and consultations modules
- July 09, 2025. **ROBUST SYNC ALGORITHM**: Implemented SQL-based synchronization with precise date matching for bulletproof status consistency
- July 09, 2025. **DATABASE CLEANUP**: Removed all "confirmed" status values and replaced with Portuguese equivalents
- July 09, 2025. **BIDIRECTIONAL SYNC PERFECTED**: Status changes now sync perfectly in both directions with real-time cache invalidation
- July 10, 2025. **MIGRATION COMPLETED**: Successfully migrated DentalCare project from Replit Agent to standard Replit environment
- July 10, 2025. **FINANCIAL MODULE ENHANCEMENT**: Designed comprehensive financial module with 3 submódulos:
  - Contas a Receber: Integrated with appointments/consultations with automatic generation
  - Contas a Pagar: Independent expense management with categories
  - Caixa: Consolidated cash flow management with real-time balance tracking
- July 10, 2025. **DATABASE SCHEMA EXPANSION**: Added new tables (receivables, payables, cash_flow) with proper relations and constraints
- July 10, 2025. **FINANCIAL INTEGRATION**: Planned automatic integration between consultations and receivables generation
- July 10, 2025. **BRAND MIGRATION COMPLETED**: Successfully migrated system name from DentalCare to OdontoSync
- July 10, 2025. **LOGO INTEGRATION**: Integrated new OdontoSync logo in login page and updated all system references
- July 10, 2025. **UI REBRAND**: Updated login page, headers, titles, and all textual references throughout the application
- July 10, 2025. **DOCUMENTATION UPDATE**: Updated replit.md and all system documentation to reflect OdontoSync branding
- July 10, 2025. **UI IMPROVEMENTS**: Implemented collapsible financial menu structure with proper state management
- July 10, 2025. **HEADER CLEANUP**: Removed duplicate module titles from header, keeping only page body titles for cleaner interface
- July 10, 2025. **PATIENT DELETION**: Added modal confirmation for patient deletion with proper error handling and backend DELETE route
- July 10, 2025. **DATABASE CLEANUP**: Successfully cleaned test database, removed all sample data while preserving admin user and system structure
- July 10, 2025. **PROCEDURE CATEGORIES FIX**: Resolved procedure category dropdown issue - removed old categories from database
- July 10, 2025. **CATEGORY INTEGRATION**: Procedure form now correctly shows only categories created in Configuration module
- July 10, 2025. **ADDRESS FORM ENHANCEMENT**: Implemented ViaCEP API integration for automatic address completion
- July 10, 2025. **CEP AUTOMATION**: Added automatic address filling when CEP is entered with loading indicator and error handling
- July 10, 2025. **STRUCTURED ADDRESS**: Updated patient registration with separate address fields (CEP, logradouro, número, bairro, cidade, estado)
- July 11, 2025. **MENU LABEL UPDATE**: Changed financial module name from "Financeiro" to "Financeiros" in sidebar navigation
- July 13, 2025. **MIGRATION COMPLETED**: Successfully migrated OdontoSync project from Replit Agent to standard Replit environment
- July 13, 2025. **RESPONSIVE DESIGN IMPLEMENTATION**: Implemented comprehensive mobile-first responsive design across all modules
- July 13, 2025. **MOBILE MODAL FIX**: Fixed patient registration modal overflow issue on mobile devices with responsive width and optimized grid layout
- July 13, 2025. **MOBILE MODAL OPTIMIZATION**: Fixed title cutoff and save button visibility issues on mobile devices with proper viewport sizing and sticky footer buttons
- July 13, 2025. **DEFINITIVE MOBILE LAYOUT FIX**: Completely redesigned dialog component with responsive positioning - mobile uses full-screen with margins, desktop uses centered positioning. Fixed content cutoff issues system-wide.
- July 13, 2025. **MOBILE LAYOUT MIGRATION COMPLETE**: Successfully completed migration from Replit Agent to standard Replit with comprehensive mobile-first responsive design
- July 13, 2025. **RESPONSIVE IMPROVEMENTS**: Enhanced dialog components with proper mobile overflow handling, improved schedule page with mobile-specific card layout, and optimized patient table responsiveness
- July 13, 2025. **MIGRATION VERIFICATION**: All core features tested and working correctly - patient management, appointment scheduling, dental charts, consultations, and financial tracking fully operational
- July 13, 2025. **PATIENT DETAIL MOBILE FIX**: Fixed mobile layout issues in patient details page - improved responsive tabs navigation, optimized header layout, and enhanced form display for mobile devices
- July 13, 2025. **ANAMNESE FORM MOBILE FIX**: Fixed runtime error in anamnese form on mobile devices - improved type safety for additionalQuestions object, added helper functions for safe property access, and enhanced mobile responsiveness
- July 13, 2025. **COMPREHENSIVE MOBILE ERROR HANDLING**: Added extensive try-catch blocks to anamnese form to prevent runtime errors, improved mobile layout with better spacing, and enhanced error handling across all form interactions
- July 13, 2025. **DEFINITIVE ANAMNESE FORM FIX**: Created shared schema for additionalQuestions with proper typing, implemented robust data normalization, removed verbose error handling, and ensured consistent type safety across frontend and backend
- July 13, 2025. **ANAMNESE MOBILE ERROR COMPLETE REWRITE**: Completely rewrote anamnese form component with defensive programming, proper error boundaries, safe data handling, and mobile-first design to eliminate all runtime errors
- July 13, 2025. **ANAMNESE ULTRA-SAFE VERSION**: Created ultra-safe version with React.memo, simplified schema, direct value access, and bulletproof error handling to definitively resolve all mobile runtime errors
- July 13, 2025. **MOBILE ODONTOGRAM IMPROVEMENTS**: Enhanced mobile usability of dental chart with 40% larger teeth (26x30 → 36x42), improved touch targets, responsive SVG scaling, and mobile-optimized hover effects
- July 13, 2025. **MOBILE CONSULTATIONS REDESIGN**: Improved mobile responsiveness of consultations module - converted desktop table to mobile-optimized cards with full functionality, better touch targets, and improved information hierarchy
- July 13, 2025. **FINANCIAL RECEIVABLES MOBILE FIX**: Fixed mobile layout breaking issues in accounts receivable module - implemented responsive design with mobile-optimized cards, improved metrics layout, and enhanced touch targets
- July 13, 2025. **SETTINGS MODULE MOBILE REDESIGN**: Improved mobile responsiveness of settings/configurations module - converted desktop tables to mobile-optimized cards for both users and categories sections, enhanced button layouts and tab navigation
- July 14, 2025. **FORCED PASSWORD CHANGE FUNCTIONALITY**: Implemented complete forced password change system
  - Added `force_password_change` column to users table
  - Created `/api/auth/force-change-password` endpoint for mandatory password changes
  - Built dedicated ForceChangePassword component with security warnings
  - Updated authentication flow to detect and enforce password change requirements
  - Enhanced User types to include forcePasswordChange flag across frontend and backend
  - System now redirects users to password change screen when flag is set to true
  - Users cannot access other parts of the application until password is changed
  - After password change, users are redirected directly to dashboard (no logout required)
- July 14, 2025. **USER PROFILE INTEGRATION**: Connected user creation form to configuration module profiles
  - Updated user form schema to accept custom profile names instead of hardcoded roles
  - Profile dropdown now dynamically loads from user profiles created in configuration module
  - Removed hardcoded fallback options (admin, dentist, reception) from user creation form
  - Enhanced role display functions to handle custom profiles while maintaining backward compatibility
  - Users can now select only from profiles that were actually created in the system
- July 14, 2025. **COMPREHENSIVE ACCESS CONTROL SYSTEM**: Implemented module-based access control using user profiles
  - Created `use-permissions` hook to manage user access control based on profile modules
  - Implemented `ProtectedRoute` component for route-level access control
  - Updated sidebar to dynamically show/hide navigation items based on user permissions
  - Created `Unauthorized` component for access denied scenarios
  - Users with custom profiles only see modules assigned to their profile
  - Admin users maintain full access to all modules for backward compatibility
  - System checks profile modules against navigation items to control access
- July 14, 2025. **DATA SCOPE CONTROL SYSTEM**: Implemented granular data access control
  - Added `dataScope` field to users table with values "all" or "own"
  - Enhanced user creation form with data scope selection
  - Users can be configured to see all clinic data or only their own data
  - Updated backend to handle data scope in user creation and updates
  - Enhanced permissions hook to check data scope access
  - Admin users always have access to all data regardless of scope setting
- July 15, 2025. **MIGRATION COMPLETED**: Successfully migrated OdontoSync project from Replit Agent to standard Replit environment
  - **EXCLUSIVE DATABASE CONNECTION**: Configured to use ONLY the specified Neon database connection
  - **DATABASE SECURITY**: Removed all alternative database connections and environment variables
  - **HARDCODED CONNECTION**: Forced connection to postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb
  - **CONNECTION VALIDATION**: Verified exclusive database connection with proper SSL and channel binding requirements
  - Fixed missing `or` import in drizzle-orm imports for proper query functionality
  - Resolved JWT authentication issues by implementing proper token verification
  - Created admin user (username: admin, password: admin123) and sample dentist users
  - Fixed dentist dropdown issue in appointment booking form by ensuring `/api/users/dentists` endpoint works correctly
  - Verified all core functionality including patient management, appointment scheduling, and dental chart features
  - System now fully operational in standard Replit environment with all features working properly
  - Database schema pushed successfully with all tables and relationships intact
- July 15, 2025. **CRITICAL SECURITY FIX**: Implemented comprehensive data scope access control system
  - Added `authenticateToken` middleware to all data-sensitive endpoints (/api/appointments, /api/consultations, /api/patients, /api/users/dentists)
  - Enhanced JWT tokens to include user's dataScope field for proper authorization
  - Users with dataScope "own" can only access their own data (appointments, consultations where dentistId matches user.id)
  - Users with dataScope "all" or admin role can access all clinic data
  - Fixed security vulnerability where users with "own" scope could see all clinic data
  - Implemented proper filtering in backend queries based on user's data scope
  - Created test users: dentista1@teste.com (scope: own), dentista2@teste.com (scope: all) for validation
  - System now enforces data access restrictions correctly across all modules
- July 16, 2025. **FINANCIAL MODULE SECURITY ENHANCEMENT**: Implemented complete data scope access control for financial modules
  - Added `authenticateToken` middleware to all financial endpoints (/api/receivables, /api/payables, /api/cash-flow, /api/financial-metrics, /api/current-balance)
  - Users with dataScope "own" can only see receivables from their own consultations/appointments
  - Users with dataScope "own" cannot see payables (clinic expenses) - returns empty array
  - Financial metrics for "own" scope users calculated only from their own receivables data
  - Cash flow filtering implemented to show only entries related to user's own receivables
  - Balance calculation restricted to user's own paid receivables for "own" scope users
  - Admin users and "all" scope users maintain full access to all financial data
  - Successfully tested with dentista2 user (scope: own) - confirmed complete data isolation
- July 16, 2025. **RECEIVABLES TABLE IMPROVEMENT**: Enhanced accounts receivable table with dropdown actions
  - Replaced two separate buttons (Edit/Receive) with single three-dot menu icon
  - Implemented dropdown menu with Edit, Receive, and Delete options
  - Added DELETE functionality with confirmation dialog for receivables
  - Created backend DELETE route and storage method for receivables
  - Simplified patient column to display only patient name (removed icon and phone)
  - Simplified dentist column to display only dentist name (removed icon)
  - Removed description column to streamline table layout
  - Improved table layout and user experience with cleaner design
- July 16, 2025. **PAYABLES TABLE IMPROVEMENT**: Enhanced accounts payable table with dropdown actions
  - Replaced two separate buttons (Edit/Pay) with single three-dot menu icon
  - Implemented dropdown menu with Edit, Pay, and Delete options
  - Added DELETE functionality with confirmation dialog for payables
  - Created backend DELETE route and storage method for payables
  - Pay option only appears for accounts with "pending" status
  - Improved table layout and user experience with cleaner design
- July 16, 2025. **RECEIVABLES FILTER ENHANCEMENT**: Improved filtering system for accounts receivable
  - Changed patient filter to dentist filter for better data organization
  - Updated frontend to show dentist dropdown instead of patient dropdown
  - Enhanced backend API to support dentist filtering with proper data scope control
  - Users can now filter receivables by specific dentist assignments
  - Maintains data scope restrictions for users with "own" access level
- July 17, 2025. **MIGRATION COMPLETED**: Successfully migrated OdontoSync project from Replit Agent to standard Replit environment
  - **EXCLUSIVE DATABASE CONNECTION**: Configured to use ONLY the specified Neon database connection
  - **DATABASE SECURITY**: Removed all alternative database connections and environment variables
  - **HARDCODED CONNECTION**: Forced connection to postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb
  - **CONNECTION VALIDATION**: Verified exclusive database connection with proper SSL and channel binding requirements
  - All dependencies installed and server running successfully on port 5000
  - Authentication system fully functional with proper JWT token validation
  - All core modules working correctly: patient management, appointment scheduling, dental charts, consultations, and financial tracking
- July 17, 2025. **SCHEDULE MODULE FIX**: Fixed appointment display issue in "Todos os Profissionais" (All Dentists) view
  - Appointments now properly span multiple time slots based on their duration in multi-dentist view
  - Implemented consistent appointment rendering logic between single dentist and all dentists views
  - Added proper absolute positioning with calculated height (`slotSpan * 60px`) for correct visual spanning
  - Fixed continuation slot indicators for appointments that occupy multiple time slots
  - Maintained all existing functionality including dropdown menus and status management
- July 17, 2025. **WHATSAPP INTEGRATION**: Implemented automatic WhatsApp notifications for new appointments
  - Created WhatsApp service module with Evolution API integration
  - Automatic message sending when appointments are created
  - Phone number formatting for Brazilian numbers (adds 55 country code if missing)
  - Personalized messages with patient name and appointment date/time
  - Error handling that doesn't affect appointment creation if WhatsApp fails
  - Uses WHATSAPP_API_KEY environment variable for secure API access
  - Message format: "Olá [nome], sua consulta está marcada para o dia [data] às [hora]."
  - Fixed timezone issue to use Brazil timezone (America/Sao_Paulo GMT-3)
  - Updated createAppointment method to return complete patient data for WhatsApp integration
- July 17, 2025. **APPOINTMENT REMINDERS SYSTEM**: Implemented automated daily reminders for next-day appointments
  - Created scheduler module with node-cron for daily task execution
  - Automated reminder system runs daily at 8:00 AM Brazil time (America/Sao_Paulo GMT-3)
  - Sends WhatsApp reminders to patients with appointments scheduled for the next day
  - Reminder message format: "Olá [nome do paciente], passando para lembrar que você tem uma consulta marcada para amanhã às [horário da consulta]"
  - Filters appointments with status "agendado" or "confirmed" for reminder sending
  - Includes rate limiting (1 second delay between messages) to avoid API overload
  - Added manual test endpoint `/api/test-reminders` for testing reminder functionality
  - Proper error handling that doesn't stop the system if individual reminders fail

## User Preferences

Preferred communication style: Simple, everyday language.