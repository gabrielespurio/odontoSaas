# OdontoSync - Sistema de Gestão Odontológica

## Overview
OdontoSync is a comprehensive dental clinic management SaaS system. It functions as a full-stack web application, offering patient management, appointment scheduling, clinical record-keeping, financial tracking, and reporting capabilities tailored for dental practices. The system aims to streamline operations and enhance efficiency for dental professionals.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)
- **Migration completed**: Successfully migrated OdontoSync from Replit Agent to standard Replit environment
- **Database**: Maintained existing Neon PostgreSQL connection as requested by user (ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech)
- **Environment Setup**: Fixed tsx dependency issue and confirmed all workflows functioning correctly
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