# OdontoSync - Sistema de Gestão Odontológica

## Overview
OdontoSync is a comprehensive dental clinic management SaaS system. It functions as a full-stack web application, offering patient management, appointment scheduling, clinical record-keeping, financial tracking, and reporting capabilities tailored for dental practices. The system aims to streamline operations and enhance efficiency for dental professionals.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)
- **Migration completed**: Successfully migrated OdontoSync from Replit Agent to standard Replit environment  
- **Database**: Maintained existing Neon PostgreSQL connection as requested by user (ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech)
- **Environment Setup**: Fixed tsx dependency issue and confirmed all workflows functioning correctly
- **Production Deployment Fixes (January 8, 2025)**: Comprehensive production optimization implemented
  - Added production-specific error handling and debugging endpoints for troubleshooting deployment issues
  - Enhanced authentication error handling with proper token cleanup and redirect logic
  - Implemented robust fetch wrapper with retry logic and timeout handling for better reliability
  - Added comprehensive logging for companies module access control and authentication flow
  - Fixed build configuration and static file serving for production deployment
  - Enhanced companies module with production-ready error recovery and debugging capabilities
  - Added frontend error reporting system for production monitoring and troubleshooting
- **WhatsApp UI Enhancement (January 8, 2025)**: Significantly improved WhatsApp configuration interface
  - Removed debug section "WhatsApp Settings Debug - Section: whatsapp" from settings page
  - Removed redundant company selector from WhatsApp settings (company selection now handled via header dropdown)  
  - Cleaned up console.log statements for better production experience
  - Improved company selection logic for super administrators
  - Enhanced user experience with cleaner, more streamlined interface
- **Settings Page Cleanup (January 8, 2025)**: Streamlined configuration categories
  - Removed undeveloped categories: "Empresa", "Segurança" and "Sistema" 
  - Kept only functional categories: "Usuários", "Procedimentos" and "Notificações"
  - Cleaned up unused imports and improved code organization
  - Interface now shows only developed features for better user experience
- **User Profile Module Enhancement (January 8, 2025)**: Extended available modules for user profiles
  - Added "Compras" module for purchase management access control
  - Added "Estoque" module for inventory management access control
  - Now supporting complete module permission system including financial operations
- **Patient Creation Fix (January 8, 2025)**: Fixed "User must belong to a company" error when creating patients
  - Updated useCompanyFilter hook to return object with companyId property
  - Modified PatientForm to properly include companyId for super administrators
  - Updated all components using useCompanyFilter to new object format
  - Added debugging logs to patient creation API endpoint for troubleshooting
- **WhatsApp Status Fix**: Improved WhatsApp status verification with multiple API endpoints for better accuracy
- **Schedule Module Company Filtering**: Fixed appointment form to properly filter patients, dentists, and procedures by selected company
  - Updated AppointmentForm to include companyId in all data queries
  - Fixed schedule page to use company filter correctly for appointments and dentists
  - Now super administrators see only data from the selected company in header dropdown
- **WhatsApp Configuration Fix**: Fixed WhatsApp setup error "Company ID is required" by correcting companyId handling in frontend and backend endpoints
- **WhatsApp QR Code Enhancement**: Improved WhatsApp integration with better QR code generation and display
  - Enhanced Evolution API integration with better error handling and logging
  - Improved QR code fetching with alternative endpoints for better reliability  
  - Added comprehensive logging for debugging WhatsApp setup issues
  - Enhanced frontend UI with better QR code display states and error handling
  - Fixed instance naming consistency for better API compatibility
- **Purchase Order Bug Fix**: Resolved critical issue with duplicate purchase order numbers (PO-2025-0021 appearing multiple times)
  - Added database migration to fix existing duplicates automatically
  - Improved order number generation algorithm to prevent race conditions
  - Added proper unique constraints for purchase_orders and receivings tables
  - Enhanced receiving number generation with consistent logic
- **UX Improvement**: Enhanced receiving form - status now defaults to "Recebido" and quantity received auto-fills with ordered quantity
- **UI Fix**: Improved field alignment in receiving form items section for better visual consistency
- **Database Structure Fix**: Completely rebuilt stock_movements table structure to match schema - removed legacy columns (type, total_price, description, reference) and added proper columns (movement_type, reason, reference_document, notes, unit_price, total_value)
- **UI Update (January 8, 2025)**: Changed module name from "Empresas" to "Empresa" in navigation menu as requested by user
- **Production Deployment Solution (January 8, 2025)**: Created comprehensive solution for Git-based external deployment
  - Created `start-production.js` - dedicated production server for external deployment via Git
  - Fixed JavaScript file serving issue causing "Unexpected token" errors in companies module
  - Implemented proper Content-Type headers for .js and .css files in production environment
  - Added multiple deployment options including Docker support and Apache/Nginx configurations
  - Created deployment scripts and documentation for seamless Git-based deployment workflow

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (with HMR)
- **UI**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS (custom dental-specific color themes)
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **Design Philosophy**: Mobile-first responsive design, intuitive UI/UX with consistent color schemes (teal dominant).

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: PostgreSQL (with Neon serverless connection)
- **ORM**: Drizzle ORM
- **Authentication**: JWT-based with bcrypt hashing
- **API Design**: RESTful API with structured error handling
- **Session Management**: PostgreSQL-based session storage

### Database
- **Primary Database**: PostgreSQL (Neon serverless)
- **Schema Management**: Drizzle Kit with migrations
- **Data Modeling**: Relational design with foreign keys and PostgreSQL enums.
- **Multi-Tenancy**: Company-based data isolation implemented across all core tables (`company_id` column for tenant segregation).

### Key Features and Design Decisions
- **Patient Management**: Comprehensive patient registry, medical history (anamnese), clinical notes, and document management. Anamnese forms use structured schemas for data persistence.
- **Dental Chart (Odontogram)**: Interactive visual chart using FDI numbering, tracking conditions and treatment history per tooth.
- **Appointment Management**: Multi-view calendar with status tracking (scheduled, in progress, completed, cancelled), resource management (dentist-specific), and real-time conflict validation considering procedure duration and multi-tenancy.
- **Clinical Documentation**: Detailed consultation records, treatment planning, and seamless integration with appointments and patients. Automatic sequential attendance numbering.
- **Financial Management**: Integrated receivables (from appointments/consultations), payables (expense management), and cash flow tracking. Supports multiple payment methods and financial reporting. Features data scope control for users.
- **User Management & Authentication**: Role-based access (Admin, Dentist, Receptionist) with JWT authentication. Includes forced password change, user profiles for access control, and granular data scope control ("all" vs "own" data).
- **Access Control**: Module-based access control (`use-permissions` hook, `ProtectedRoute`) and data-level access control (`dataScope` field for users).
- **Automation**: Automatic WhatsApp notifications for new appointments and daily reminders for next-day appointments.
- **Reporting**: Comprehensive reports for overview, financial, appointments, and procedures with data scope control and CSV export.
- **UX Improvements**: ViaCEP API integration for address auto-completion, dynamic UI elements (e.g., conditional fields in forms), and improved table actions with dropdown menus.
- **Error Handling**: Robust error handling across frontend and backend, including specific messages for appointment conflicts and validation issues.
- **State Management Strategy**: Combination of TanStack Query for server state, local React state for immediate UI updates, and an aggressive cache invalidation strategy for data consistency.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL serverless connection.
- **drizzle-orm**: Type-safe ORM for database interactions.
- **@tanstack/react-query**: Server state management in the frontend.
- **@radix-ui/***: Headless UI components.
- **react-hook-form**: Form management.
- **zod**: Runtime type validation.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT token management.
- **tailwindcss**: Utility-first CSS framework.
- **vite**: Frontend build tool and development server.
- **node-cron**: For scheduling automated tasks (e.g., WhatsApp reminders).
- **Evolution API**: For WhatsApp integration.
- **ViaCEP API**: For automatic address completion.