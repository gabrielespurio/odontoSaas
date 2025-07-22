import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, or, sql, isNull, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { sendWhatsAppMessage, formatAppointmentMessage } from "./whatsapp";
import { sendDailyReminders } from "./scheduler";
import { formatDateForDatabase, formatDateForFrontend } from "./utils/date-formatter";
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertProcedureSchema, 
  insertAppointmentSchema, 
  insertConsultationSchema, 
  insertDentalChartSchema, 
  insertAnamneseSchema, 
  insertFinancialSchema,
  insertProcedureCategorySchema,
  insertUserProfileSchema,
  insertReceivableSchema,
  insertPayableSchema,
  insertCashFlowSchema,
  insertCompanySchema,
  users,
  patients,
  appointments,
  consultations,
  procedures,
  procedureCategories,
  userProfiles,
  dentalChart,
  anamnese,
  financial,
  receivables,
  payables,
  cashFlow,
  companies
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return res.status(403).json({ message: 'Invalid token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {





  // Debug endpoint to check users - NO AUTH
  app.get("/debug/users", async (req, res) => {
    try {
      const usersData = await db.select().from(users);
      res.json(usersData);
    } catch (error) {
      console.error("Debug users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Debug receivables investigation - NO AUTH  
  app.get("/debug/receivables", async (req, res) => {
    try {
      const receivablesData = await storage.getReceivables();
      const proceduresData = await storage.getProcedures();
      
      res.json({
        receivables: receivablesData,
        procedures: proceduresData
      });
    } catch (error) {
      console.error("Debug investigation error:", error);
      res.status(500).json({ message: "Erro na investigação" });
    }
  });

  // Debug receivables investigation (temporary public endpoint)
  app.get("/api/debug/receivables-investigation", async (req, res) => {
    try {
      const db = await getDb();
      
      // Buscar todas as contas a receber com detalhes
      const receivablesData = await db.select({
        receivableId: receivables.id,
        amount: receivables.amount,
        description: receivables.description,
        consultationId: receivables.consultationId,
        installments: receivables.installments,
        installmentNumber: receivables.installmentNumber,
        patientName: patients.name,
        consultationProcedures: consultations.procedures,
        consultationTotal: consultations.totalAmount
      })
      .from(receivables)
      .leftJoin(patients, eq(receivables.patientId, patients.id))
      .leftJoin(consultations, eq(receivables.consultationId, consultations.id))
      .orderBy(receivables.createdAt);
      
      // Buscar todos os procedimentos
      const proceduresData = await db.select().from(procedures);
      
      res.json({
        receivables: receivablesData,
        procedures: proceduresData
      });
    } catch (error) {
      console.error("Debug investigation error:", error);
      res.status(500).json({ message: "Erro na investigação" });
    }
  });

  // Debug endpoint to create tables (temporary) - NO AUTH
  app.post("/api/debug/create-tables", async (req, res) => {
    try {
      const createTablesSQL = `
        -- Create receivables table
        CREATE TABLE IF NOT EXISTS "receivables" (
          "id" serial PRIMARY KEY NOT NULL,
          "patient_id" integer NOT NULL,
          "consultation_id" integer,
          "appointment_id" integer,
          "amount" numeric(10,2) NOT NULL,
          "due_date" date NOT NULL,
          "payment_date" date,
          "payment_method" varchar(50),
          "status" varchar(20) DEFAULT 'pending' NOT NULL,
          "description" text,
          "installments" integer DEFAULT 1 NOT NULL,
          "installment_number" integer DEFAULT 1 NOT NULL,
          "parent_receivable_id" integer,
          "notes" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "receivables_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE no action ON UPDATE no action,
          CONSTRAINT "receivables_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE no action ON UPDATE no action,
          CONSTRAINT "receivables_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE no action ON UPDATE no action,
          CONSTRAINT "receivables_parent_receivable_id_receivables_id_fk" FOREIGN KEY ("parent_receivable_id") REFERENCES "receivables"("id") ON DELETE no action ON UPDATE no action
        );

        -- Create payables table
        CREATE TABLE IF NOT EXISTS "payables" (
          "id" serial PRIMARY KEY NOT NULL,
          "amount" numeric(10,2) NOT NULL,
          "due_date" date NOT NULL,
          "payment_date" date,
          "payment_method" varchar(50),
          "status" varchar(20) DEFAULT 'pending' NOT NULL,
          "description" text NOT NULL,
          "category" varchar(100) NOT NULL,
          "supplier" varchar(255),
          "notes" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- Create cash_flow table
        CREATE TABLE IF NOT EXISTS "cash_flow" (
          "id" serial PRIMARY KEY NOT NULL,
          "type" varchar(20) NOT NULL,
          "amount" numeric(10,2) NOT NULL,
          "description" text NOT NULL,
          "date" date NOT NULL,
          "category" varchar(100),
          "receivable_id" integer,
          "payable_id" integer,
          "created_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "cash_flow_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE no action ON UPDATE no action,
          CONSTRAINT "cash_flow_payable_id_payables_id_fk" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE no action ON UPDATE no action
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS "receivables_patient_id_idx" ON "receivables" ("patient_id");
        CREATE INDEX IF NOT EXISTS "receivables_consultation_id_idx" ON "receivables" ("consultation_id");
        CREATE INDEX IF NOT EXISTS "receivables_appointment_id_idx" ON "receivables" ("appointment_id");
        CREATE INDEX IF NOT EXISTS "receivables_status_idx" ON "receivables" ("status");
        CREATE INDEX IF NOT EXISTS "receivables_due_date_idx" ON "receivables" ("due_date");

        CREATE INDEX IF NOT EXISTS "payables_status_idx" ON "payables" ("status");
        CREATE INDEX IF NOT EXISTS "payables_due_date_idx" ON "payables" ("due_date");
        CREATE INDEX IF NOT EXISTS "payables_category_idx" ON "payables" ("category");

        CREATE INDEX IF NOT EXISTS "cash_flow_type_idx" ON "cash_flow" ("type");
        CREATE INDEX IF NOT EXISTS "cash_flow_date_idx" ON "cash_flow" ("date");
        CREATE INDEX IF NOT EXISTS "cash_flow_receivable_id_idx" ON "cash_flow" ("receivable_id");
        CREATE INDEX IF NOT EXISTS "cash_flow_payable_id_idx" ON "cash_flow" ("payable_id");
      `;

      await db.execute(createTablesSQL);
      
      // Verificar se as tabelas foram criadas
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('receivables', 'payables', 'cash_flow')
        ORDER BY table_name;
      `);
      
      res.json({ 
        message: "Tables created successfully", 
        tables: result.rows?.map(r => r.table_name) || []
      });
    } catch (error) {
      console.error("Create tables error:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user by email
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, companyId: user.companyId, dataScope: user.dataScope },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          companyId: user.companyId,
          dataScope: user.dataScope 
        },
        forcePasswordChange: user.forcePasswordChange 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and reset forcePasswordChange flag
      await storage.updateUser(userId, { 
        password: hashedPassword,
        forcePasswordChange: false 
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forced password change endpoint (no current password required)
  app.post("/api/auth/force-change-password", authenticateToken, async (req, res) => {
    try {
      const { newPassword } = req.body;
      const userId = (req as any).user.id;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and reset forcePasswordChange flag
      await storage.updateUser(userId, { 
        password: hashedPassword,
        forcePasswordChange: false 
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Force change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, dataScope: user.dataScope },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          dataScope: user.dataScope 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Debug endpoint to check users - NO AUTH (moved above authentication)
  app.get("/api/debug/users", async (req, res) => {
    try {
      const usersData = await db.select().from(users);
      res.json(usersData);
    } catch (error) {
      console.error("Debug users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get dentists only - WITH AUTH AND DATA SCOPE CONTROL
  app.get("/api/users/dentists", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      
      // If user has "own" scope and is not admin, only return themselves if they are a dentist
      if (user.role !== "admin" && user.dataScope === "own") {
        if (user.role === "Dentista" || user.role === "dentista" || user.role === "dentist") {
          const dentists = await db.select({
            id: users.id,
            username: users.username,
            name: users.name,
            email: users.email,
            role: users.role,
            isActive: users.isActive,
            createdAt: users.createdAt,
          }).from(users).where(
            and(
              eq(users.id, user.id),
              eq(users.isActive, true)
            )
          );
          res.json(dentists);
        } else {
          res.json([]);
        }
      } else {
        // Admin or users with "all" scope can see all dentists
        const dentistsData = await db.select({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        }).from(users).where(
          and(
            or(
              eq(users.role, "Dentista"),
              eq(users.role, "dentista"),
              eq(users.role, "dentist")
            ),
            eq(users.isActive, true)
          )
        ).orderBy(users.name);
        res.json(dentistsData);
      }
    } catch (error) {
      console.error("Get dentists error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check user data scope
  app.get("/api/user-scope", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      res.json({
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        dataScope: user.dataScope,
        hasFullAccess: user.role === "admin" || user.dataScope === "all"
      });
    } catch (error) {
      console.error("User scope error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user's company information
  app.get("/api/user/company", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      
      if (!user.companyId) {
        return res.json({ 
          companyName: "System Administrator",
          isSystemAdmin: true 
        });
      }

      const [company] = await db.select().from(companies).where(eq(companies.id, user.companyId));
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.json({
        companyName: company.name,
        tradeName: company.tradeName,
        isSystemAdmin: false
      });
    } catch (error) {
      console.error("Get user company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Protected routes
  app.use("/api", authenticateToken);

  // Dashboard
  app.get("/api/dashboard/metrics", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      const metrics = await storage.getDashboardMetrics(user.companyId);
      res.json(metrics);
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Patients
  app.get("/api/patients", authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      
      // Apply company-based data isolation
      const user = req.user;
      const companyId = user.companyId;
      
      const patients = await storage.getPatients(limit, offset, search, companyId);
      res.json(patients);
    } catch (error) {
      console.error("Get patients error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patients/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      
      const patient = await storage.getPatient(id);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Check if patient belongs to user's company
      if (user.companyId && patient.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Get patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      
      // Verificar se o usuário tem companyId
      if (!user.companyId) {
        return res.status(400).json({ message: "User must belong to a company" });
      }
      
      const patientData = insertPatientSchema.parse(req.body);
      
      // CRITICAL: Add company ID from authenticated user
      const patientWithCompany = {
        ...patientData,
        companyId: user.companyId
      };
      
      const patient = await storage.createPatient(patientWithCompany);
      res.json(patient);
    } catch (error) {
      console.error("Create patient error:", error);
      if (error.name === 'ZodError') {
        console.error("Validation error details:", error.issues);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.issues 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/patients/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      const patientData = insertPatientSchema.partial().parse(req.body);
      
      // Check if patient belongs to user's company before updating
      const existingPatient = await storage.getPatient(id);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      if (user.companyId && existingPatient.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const patient = await storage.updatePatient(id, patientData);
      res.json(patient);
    } catch (error) {
      console.error("Update patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if patient exists
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Delete patient from database
      await db.delete(patients).where(eq(patients.id, id));
      
      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      console.error("Delete patient error:", error);
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Users Management
  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      const companyId = req.query.companyId || user.companyId;
      
      let query = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        dataScope: users.dataScope,
        companyId: users.companyId,
        forcePasswordChange: users.forcePasswordChange,
        createdAt: users.createdAt,
      }).from(users);
      
      // Always filter by company for data isolation
      if (companyId) {
        query = query.where(eq(users.companyId, parseInt(companyId as string)));
      }
      
      const usersData = await query.orderBy(users.name);
      res.json(usersData);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", authenticateToken, async (req, res) => {
    try {
      const loggedUser = req.user;
      
      // Verificar se o usuário logado tem companyId
      if (!loggedUser.companyId) {
        return res.status(400).json({ message: "User must belong to a company" });
      }
      
      // Create custom schema for user creation without username field
      const userCreateSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.string().min(1), // Changed to accept any string (custom profiles)
        dataScope: z.enum(["all", "own"]).optional().default("all"),
        forcePasswordChange: z.boolean().optional(),
      });
      
      const userData = userCreateSchema.parse(req.body);
      
      // CRITICAL: Use the company ID from the logged user
      const companyId = loggedUser.companyId;
      
      // Check if email already exists within the same company
      const existingUser = await storage.getUserByEmailAndCompany(userData.email, companyId);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Um usuário com este email já existe nesta empresa." 
        });
      }
      
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Generate unique username from email (part before @) with company suffix
      let baseUsername = userData.email.split('@')[0];
      let username = `${baseUsername}_c${companyId}`;
      
      // Check if username already exists and add counter if needed
      let counter = 1;
      let finalUsername = username;
      while (true) {
        try {
          const existingUser = await storage.getUserByUsername(finalUsername);
          if (!existingUser) break;
          finalUsername = `${username}_${counter}`;
          counter++;
        } catch (error) {
          // If getUserByUsername doesn't exist, break and use current username
          break;
        }
      }
      
      // Create user with unique username, forcePasswordChange and companyId
      const userToCreate = {
        username: finalUsername,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        dataScope: userData.dataScope,
        forcePasswordChange: userData.forcePasswordChange || false,
        companyId: companyId, // CRITICAL: Always use logged user's company
        isActive: true,
      };
      
      const user = await storage.createUser(userToCreate);
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        dataScope: user.dataScope,
        companyId: user.companyId,
        forcePasswordChange: user.forcePasswordChange,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Create user error:", error);
      if (error.name === 'ZodError') {
        console.error("Validation error details:", error.issues);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.issues 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      
      let updateData = { ...userData };
      if (userData.password) {
        updateData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const user = await storage.updateUser(id, updateData);
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        dataScope: user.dataScope,
        forcePasswordChange: user.forcePasswordChange,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete user from database
      await db.delete(users).where(eq(users.id, id));
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });



  // Procedure Categories
  app.get("/api/procedure-categories", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      // CRITICAL: Filter categories by company
      const categories = await storage.getProcedureCategories(user.companyId);
      res.json(categories);
    } catch (error) {
      console.error("Get procedure categories error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/procedure-categories", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      const categoryData = insertProcedureCategorySchema.parse(req.body);
      
      // CRITICAL: Add company ID to category
      const categoryWithCompany = {
        ...categoryData,
        companyId: user.companyId
      };
      
      const category = await storage.createProcedureCategory(categoryWithCompany);
      res.json(category);
    } catch (error) {
      console.error("Create procedure category error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/procedure-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = insertProcedureCategorySchema.partial().parse(req.body);
      const category = await storage.updateProcedureCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Update procedure category error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Profiles
  app.get("/api/user-profiles", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      // CRITICAL: Filter user profiles by company
      const profiles = await storage.getUserProfiles(user.companyId);
      res.json(profiles);
    } catch (error) {
      console.error("Get user profiles error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user-profiles", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      
      // Verificar se o usuário tem companyId
      if (!user.companyId) {
        return res.status(400).json({ message: "User must belong to a company" });
      }
      
      const profileData = insertUserProfileSchema.parse(req.body);
      
      // CRITICAL: Add company ID to profile
      const profileWithCompany = {
        ...profileData,
        companyId: user.companyId
      };
      
      const profile = await storage.createUserProfile(profileWithCompany);
      res.json(profile);
    } catch (error) {
      console.error("Create user profile error:", error);
      if (error.name === 'ZodError') {
        console.error("Validation error details:", error.issues);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.issues 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/user-profiles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const profileData = insertUserProfileSchema.partial().parse(req.body);
      const profile = await storage.updateUserProfile(id, profileData);
      res.json(profile);
    } catch (error) {
      console.error("Update user profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Procedures
  app.get("/api/procedures", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      
      // CRITICAL: Filter procedures by company
      const procedures = await storage.getProcedures(limit, offset, search, categoryId, user.companyId);
      res.json(procedures);
    } catch (error) {
      console.error("Get procedures error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/procedures", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      const procedureData = insertProcedureSchema.parse(req.body);
      
      // CRITICAL: Add company ID to procedure
      const procedureWithCompany = {
        ...procedureData,
        companyId: user.companyId
      };
      
      const procedure = await storage.createProcedure(procedureWithCompany);
      res.json(procedure);
    } catch (error) {
      console.error("Create procedure error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/procedures/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      const procedureData = insertProcedureSchema.partial().parse(req.body);
      
      // CRITICAL: Verify procedure belongs to user's company
      const existingProcedure = await storage.getProcedure(id);
      if (!existingProcedure) {
        return res.status(404).json({ message: "Procedimento não encontrado" });
      }
      
      if (user.companyId && existingProcedure.companyId !== user.companyId) {
        return res.status(403).json({ message: "Acesso negado - procedimento não pertence à sua empresa" });
      }
      
      const procedure = await storage.updateProcedure(id, procedureData);
      res.json(procedure);
    } catch (error) {
      console.error("Update procedure error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Appointments
  app.get("/api/appointments", authenticateToken, async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      let dentistId = req.query.dentistId ? parseInt(req.query.dentistId as string) : undefined;
      
      // Apply data scope control
      const user = req.user;
      if (user.role !== "admin" && user.dataScope === "own") {
        // Users with "own" scope can only see their own appointments
        dentistId = user.id;
      }
      
      const appointments = await storage.getAppointments(date, dentistId, startDate, endDate, user.companyId);
      
      // Format dates for frontend
      const formattedAppointments = appointments.map(appointment => ({
        ...appointment,
        scheduledDate: formatDateForFrontend(appointment.scheduledDate)
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error("Get appointments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const body = req.body;
      
      // Keep the date as string for Zod validation, but process it correctly
      const appointmentData = insertAppointmentSchema.parse(body);
      
      // Convert to Date object after validation
      if (typeof appointmentData.scheduledDate === 'string') {
        appointmentData.scheduledDate = formatDateForDatabase(appointmentData.scheduledDate);
      }
      
      // Enhanced conflict validation is now handled in storage layer
      const appointment = await storage.createAppointment(appointmentData);
      
      // Send WhatsApp message to patient
      try {
        if (appointment.patient?.phone) {
          const message = formatAppointmentMessage(
            appointment.patient.name, 
            new Date(appointment.scheduledDate)
          );
          
          const success = await sendWhatsAppMessage(appointment.patient.phone, message);
          if (success) {
            console.log(`WhatsApp notification sent successfully for appointment ${appointment.id}`);
          } else {
            console.log(`WhatsApp notification failed for appointment ${appointment.id}`);
          }
        } else {
          console.log(`No phone number found for patient ${appointment.patient?.name}`);
        }
      } catch (whatsappError) {
        // Don't fail the appointment creation if WhatsApp fails
        console.error("WhatsApp notification error:", whatsappError);
      }
      
      // Format the date for frontend before sending
      const formattedAppointment = {
        ...appointment,
        scheduledDate: formatDateForFrontend(appointment.scheduledDate)
      };
      
      res.json(formattedAppointment);
    } catch (error) {
      console.error("Create appointment error:", error);
      if (error.message.includes("Conflito de horário")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint para sincronizar todos os status
  app.post("/api/sync-status", async (req, res) => {
    try {
      console.log("Starting complete status synchronization...");
      
      // Sincronizar todos os agendamentos com suas consultas correspondentes
      const syncQuery = `
        UPDATE appointments 
        SET status = consultations.status
        FROM consultations 
        WHERE appointments.patient_id = consultations.patient_id 
          AND appointments.dentist_id = consultations.dentist_id 
          AND DATE(appointments.scheduled_date) = DATE(consultations.date)
          AND appointments.status != consultations.status;
      `;
      
      const result = await db.execute(sql.raw(syncQuery));
      
      console.log("Status synchronization completed");
      res.json({ 
        success: true, 
        message: "Status synchronization completed successfully",
        updatedRows: result.rowCount || 0
      });
    } catch (error) {
      console.error("Sync status error:", error);
      res.status(500).json({ message: "Error synchronizing status" });
    }
  });

  // Endpoint para cancelar todos os agendamentos
  app.post("/api/appointments/cancel-all", async (req, res) => {
    try {
      const result = await storage.cancelAllAppointments();
      
      res.json({ 
        success: true, 
        message: `${result.count} agendamentos foram cancelados com sucesso`,
        count: result.count
      });
    } catch (error) {
      console.error("Cancel all appointments error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para limpar agendamentos cancelados (hard delete)
  app.post("/api/appointments/cleanup-cancelled", async (req, res) => {
    try {
      const result = await storage.cleanupCancelledAppointments();
      
      res.json({ 
        success: true, 
        message: `${result.count} agendamentos cancelados foram removidos permanentemente`,
        count: result.count
      });
    } catch (error) {
      console.error("Cleanup cancelled appointments error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para verificar disponibilidade de slot
  app.post("/api/appointments/check-availability", authenticateToken, async (req, res) => {
    try {
      const { dentistId, scheduledDate, procedureId, excludeId } = req.body;
      
      // Usar o timezone do Brasil para verificação
      const dateToCheck = new Date(scheduledDate);
      
      const result = await storage.isSlotAvailable(
        dentistId, 
        dateToCheck, 
        procedureId, 
        excludeId
      );
      
      res.json(result);
    } catch (error) {
      console.error("Check availability error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para buscar agendamentos que não têm consulta correspondente
  app.get("/api/appointments-without-consultation", authenticateToken, async (req, res) => {
    try {
      // Apply data scope control
      const user = req.user;
      let whereConditions = [
        isNull(consultations.id),
        sql`${appointments.status} != 'cancelado'` // Filter out cancelled appointments
      ];
      
      if (user.role !== "admin" && user.dataScope === "own") {
        // Users with "own" scope can only see their own appointments
        whereConditions.push(eq(appointments.dentistId, user.id));
      }
      
      const appointmentsWithoutConsultation = await db.select({
        id: appointments.id,
        patientId: appointments.patientId,
        dentistId: appointments.dentistId,
        procedureId: appointments.procedureId,
        scheduledDate: appointments.scheduledDate,
        status: appointments.status,
        notes: appointments.notes,
        patient: {
          id: patients.id,
          name: patients.name,
          cpf: patients.cpf,
          email: patients.email,
          phone: patients.phone,
        },
        dentist: {
          id: users.id,
          name: users.name,
          username: users.username,
          email: users.email,
          role: users.role,
        },
        procedure: {
          id: procedures.id,
          name: procedures.name,
          description: procedures.description,
          price: procedures.price,
          duration: procedures.duration,
          category: procedures.category,
        }
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.dentistId, users.id))
      .leftJoin(procedures, eq(appointments.procedureId, procedures.id))
      .leftJoin(consultations, eq(appointments.id, consultations.appointmentId))
      .where(and(...whereConditions))
      .orderBy(desc(appointments.scheduledDate));

      res.json(appointmentsWithoutConsultation);
    } catch (error) {
      console.error("Get appointments without consultation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;
      
      // Format the date for database storage
      if (typeof body.scheduledDate === 'string') {
        body.scheduledDate = formatDateForDatabase(body.scheduledDate);
      }
      
      const appointmentData = insertAppointmentSchema.partial().parse(body);
      
      // Buscar o agendamento atual para comparar status
      const currentAppointment = await storage.getAppointment(id);
      
      // Validar se o horário está disponível (apenas se a data estiver sendo alterada)
      if (appointmentData.scheduledDate) {
        const scheduledDate = new Date(appointmentData.scheduledDate);
        const newStartTime = scheduledDate.getTime();
        const existingAppointments = await storage.getAppointments(scheduledDate, appointmentData.dentistId);
        
        // Verificar se o novo horário conflita com algum procedimento em andamento (exceto o atual)
        const conflictingAppointment = existingAppointments.find(apt => {
          if (apt.id === id) return false; // Ignora o próprio agendamento
          
          const aptDate = new Date(apt.scheduledDate);
          const aptStartTime = aptDate.getTime();
          const aptEndTime = aptStartTime + (apt.procedure.duration * 60 * 1000);
          
          // Verifica se o novo horário está dentro do período do procedimento existente
          return newStartTime >= aptStartTime && newStartTime < aptEndTime;
        });
        
        if (conflictingAppointment) {
          const conflictStart = new Date(conflictingAppointment.scheduledDate);
          const conflictEnd = new Date(conflictStart.getTime() + (conflictingAppointment.procedure.duration * 60 * 1000));
          
          return res.status(409).json({ 
            message: `Horário ocupado pelo procedimento "${conflictingAppointment.procedure.name}" que vai das ${conflictStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${conflictEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` 
          });
        }
      }
      
      const appointment = await storage.updateAppointment(id, appointmentData);
      
      // Se o status foi alterado, sincronizar com consultas relacionadas
      if (appointmentData.status && currentAppointment && appointmentData.status !== currentAppointment.status) {
        try {
          // Buscar consultas do mesmo paciente, dentista e data usando SQL direto
          const appointmentDate = new Date(currentAppointment.scheduledDate);
          const consultationsResult = await db.select({
            id: consultations.id,
            status: consultations.status,
            patientId: consultations.patientId,
            dentistId: consultations.dentistId,
            date: consultations.date,
          }).from(consultations).where(
            and(
              eq(consultations.patientId, currentAppointment.patientId),
              eq(consultations.dentistId, currentAppointment.dentistId),
              sql`DATE(${consultations.date}) = DATE(${appointmentDate.toISOString()})`
            )
          );
          
          // Atualizar status das consultas relacionadas
          for (const consultation of consultationsResult) {
            if (consultation.status !== appointmentData.status) {
              await storage.updateConsultation(consultation.id, { status: appointmentData.status });
            }
          }
          
          console.log(`Synchronized status "${appointmentData.status}" for ${consultationsResult.length} related consultations`);
        } catch (syncError) {
          console.error("Error synchronizing consultation status:", syncError);
          // Não falhar a requisição principal por causa do erro de sincronização
        }
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Update appointment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test endpoint for manual reminder sending
  app.post("/api/test-reminders", authenticateToken, async (req: Request, res: Response) => {
    try {
      console.log("Manual reminder test triggered");
      await sendDailyReminders();
      res.json({ message: "Daily reminders test completed successfully" });
    } catch (error) {
      console.error("Error in manual reminder test:", error);
      res.status(500).json({ message: "Error testing reminders", error: error.message });
    }
  });

  // Reports endpoints
  app.get("/api/reports/overview", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const report = await storage.getOverviewReport(user, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Get overview report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reports/financial", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const report = await storage.getFinancialReport(user, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Get financial report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reports/appointments", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const report = await storage.getAppointmentsReport(user, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Get appointments report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reports/procedures", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const report = await storage.getProceduresReport(user, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Get procedures report error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Consultations
  app.get("/api/consultations", authenticateToken, async (req, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      let dentistId = req.query.dentistId ? parseInt(req.query.dentistId as string) : undefined;
      const status = req.query.status as string | undefined;
      
      // Apply data scope control
      const user = req.user;
      if (user.role !== "admin" && user.dataScope === "own") {
        // Users with "own" scope can only see their own consultations
        dentistId = user.id;
      }
      
      // CRITICAL: Pass user's companyId for data isolation
      const consultations = await storage.getConsultations(patientId, dentistId, status, user.companyId);
      res.json(consultations);
    } catch (error) {
      console.error("Get consultations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/consultations", authenticateToken, async (req, res) => {
    try {
      const consultationData = insertConsultationSchema.parse(req.body);
      
      // Get user from authentication
      const user = req.user;
      
      // Validar se a data não está no passado
      const consultationDate = new Date(consultationData.date);
      const now = new Date();
      
      // Adiciona uma margem de 1 minuto para evitar problemas de timing
      const nowWithMargin = new Date(now.getTime() + 60000);
      
      if (consultationDate < nowWithMargin) {
        return res.status(400).json({ 
          message: "Não é possível criar consultas com data e horário no passado." 
        });
      }
      
      // CRITICAL: Verify that the patient and dentist belong to the user's company
      const patient = await storage.getPatient(consultationData.patientId);
      const dentist = await storage.getUser(consultationData.dentistId);
      
      if (!patient || patient.companyId !== user.companyId) {
        return res.status(403).json({ message: "Paciente não encontrado ou não pertence à sua empresa" });
      }
      
      if (!dentist || dentist.companyId !== user.companyId) {
        return res.status(403).json({ message: "Dentista não encontrado ou não pertence à sua empresa" });
      }
      
      // Verify user has permission to create consultation for this dentist
      if (user.role !== "admin" && user.dataScope === "own" && consultationData.dentistId !== user.id) {
        return res.status(403).json({ message: "Você só pode criar consultas para si mesmo" });
      }
      
      // Criar a consulta primeiro
      const consultation = await storage.createConsultation(consultationData);
      
      // Se a consulta tem procedimentos, criar agendamentos correspondentes
      if (consultationData.procedures && consultationData.procedures.length > 0) {
        let currentDateTime = new Date(consultationData.date);
        
        for (const procedureName of consultationData.procedures) {
          // Buscar informações do procedimento pelo nome
          const procedures = await storage.getProcedures();
          const procedure = procedures.find(p => p.name === procedureName);
          
          if (procedure) {
            // Verificar se o horário está disponível
            const startTime = currentDateTime.getTime();
            const existingAppointments = await storage.getAppointments(currentDateTime, consultationData.dentistId);
            
            // Verificar conflitos
            const conflictingAppointment = existingAppointments.find(apt => {
              const aptDate = new Date(apt.scheduledDate);
              const aptStartTime = aptDate.getTime();
              const aptEndTime = aptStartTime + (apt.procedure.duration * 60 * 1000);
              
              return startTime >= aptStartTime && startTime < aptEndTime;
            });
            
            if (!conflictingAppointment) {
              // Criar o agendamento
              const appointmentData = {
                companyId: 1, // Temporary fix - should get from user context
                patientId: consultationData.patientId,
                dentistId: consultationData.dentistId,
                procedureId: procedure.id,
                scheduledDate: currentDateTime,
                status: "agendado" as const,
                notes: `Agendamento criado automaticamente pela consulta #${consultation.id}`
              };
              
              await storage.createAppointment(appointmentData);
              
              // Avançar o horário para o próximo procedimento
              currentDateTime = new Date(currentDateTime.getTime() + (procedure.duration * 60 * 1000));
            } else {
              console.warn(`Conflito de horário detectado para procedimento ${procedureName} às ${currentDateTime.toLocaleTimeString('pt-BR')}`);
            }
          }
        }
      }
      
      res.json(consultation);
    } catch (error) {
      console.error("Create consultation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/consultations/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const consultationData = insertConsultationSchema.partial().parse(req.body);
      
      // Get user from authentication
      const user = req.user;
      
      // Validar se a data não está no passado (apenas se a data estiver sendo alterada)
      if (consultationData.date) {
        const consultationDate = new Date(consultationData.date);
        const now = new Date();
        
        // Adiciona uma margem de 1 minuto para evitar problemas de timing
        const nowWithMargin = new Date(now.getTime() + 60000);
        
        if (consultationDate < nowWithMargin) {
          return res.status(400).json({ 
            message: "Não é possível alterar consultas para data e horário no passado." 
          });
        }
      }
      
      // CRITICAL: Verify company access and get consultation with company filtering
      const currentConsultation = await storage.getConsultation(id, user.companyId);
      
      if (!currentConsultation) {
        return res.status(404).json({ message: "Consulta não encontrada" });
      }
      
      // Verify user has permission to edit this consultation
      if (user.role !== "admin" && user.dataScope === "own" && currentConsultation.dentistId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Atualizar a consulta
      const consultation = await storage.updateConsultation(id, consultationData);
      
      // Se o status foi alterado, sincronizar com agendamentos relacionados
      if (consultationData.status && currentConsultation && consultationData.status !== currentConsultation.status) {
        try {
          // Buscar agendamentos do mesmo paciente, dentista e data usando SQL direto
          const consultationDate = new Date(currentConsultation.date);
          const appointmentsResult = await db.select({
            id: appointments.id,
            status: appointments.status,
            patientId: appointments.patientId,
            dentistId: appointments.dentistId,
            scheduledDate: appointments.scheduledDate,
          }).from(appointments).where(
            and(
              eq(appointments.patientId, currentConsultation.patientId),
              eq(appointments.dentistId, currentConsultation.dentistId),
              sql`DATE(${appointments.scheduledDate}) = DATE(${consultationDate.toISOString()})`
            )
          );
          
          // Atualizar status dos agendamentos relacionados
          for (const appointment of appointmentsResult) {
            if (appointment.status !== consultationData.status) {
              await storage.updateAppointment(appointment.id, { status: consultationData.status });
            }
          }
          
          console.log(`Synchronized status "${consultationData.status}" for ${appointmentsResult.length} related appointments`);
        } catch (syncError) {
          console.error("Error synchronizing appointment status:", syncError);
          // Não falhar a requisição principal por causa do erro de sincronização
        }
      }
      
      res.json(consultation);
    } catch (error) {
      console.error("Update consultation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/consultations/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      
      // CRITICAL: Verify company access and get consultation with company filtering
      const consultation = await storage.getConsultation(id, user.companyId);
      if (!consultation) {
        return res.status(404).json({ message: "Consulta não encontrada" });
      }
      
      // Verificar se o usuário tem permissão para excluir
      if (user.role !== "admin" && user.dataScope === "own" && consultation.dentistId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Excluir a consulta
      await storage.deleteConsultation(id);
      
      res.json({ success: true, message: "Consulta excluída com sucesso" });
    } catch (error) {
      console.error("Delete consultation error:", error);
      
      // Handle specific database constraint errors
      if (error.code === '23503') {
        res.status(400).json({ 
          message: "Não é possível excluir esta consulta pois existem registros financeiros relacionados" 
        });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // Dental Chart
  app.get("/api/dental-chart/:patientId", authenticateToken, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const user = req.user;
      
      // Verificar se o paciente pertence à empresa do usuário
      const patient = await storage.getPatient(patientId);
      if (!patient || (user.companyId && patient.companyId !== user.companyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const dentalChart = await storage.getDentalChart(patientId);
      res.json(dentalChart);
    } catch (error) {
      console.error("Get dental chart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/dental-chart/:patientId/:toothNumber", authenticateToken, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const toothNumber = req.params.toothNumber;
      const user = req.user;
      
      // Verificar se o usuário tem companyId
      if (!user.companyId) {
        return res.status(400).json({ message: "User must belong to a company" });
      }
      
      // Verificar se o paciente pertence à empresa do usuário
      const patient = await storage.getPatient(patientId);
      if (!patient || patient.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Create the data without companyId for validation
      const dentalChartData = {
        patientId: patientId,
        toothNumber: toothNumber,
        condition: req.body.condition || "healthy",
        notes: req.body.notes || "",
        treatmentDate: req.body.treatmentDate || new Date().toISOString().split('T')[0]
      };
      
      console.log('Received dental chart update:', dentalChartData);
      
      // Validate data without companyId
      const validatedData = insertDentalChartSchema.parse(dentalChartData);
      
      // Add companyId after validation
      const finalData = {
        ...validatedData,
        companyId: user.companyId
      };
      
      const updatedTooth = await storage.updateToothCondition(patientId, toothNumber, finalData);
      res.json(updatedTooth);
    } catch (error) {
      console.error("Update tooth condition error:", error);
      if (error.name === 'ZodError') {
        console.error("Validation error details:", error.issues);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.issues 
        });
      }
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Anamnese
  app.get("/api/anamnese/:patientId", authenticateToken, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      console.log(`Getting anamnese for patient ${patientId}`);
      const anamnese = await storage.getAnamnese(patientId);
      console.log(`Anamnese result:`, anamnese);
      
      // If no anamnese found, return null instead of undefined
      if (!anamnese) {
        console.log(`No anamnese found for patient ${patientId}, returning null`);
        res.json(null);
      } else {
        res.json(anamnese);
      }
    } catch (error) {
      console.error("Get anamnese error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/anamnese", authenticateToken, async (req, res) => {
    try {
      const anamneseData = insertAnamneseSchema.parse(req.body);
      
      // Convert individual fields to additionalQuestions object
      const additionalQuestions = {
        hasHeartProblems: anamneseData.hasHeartProblems || false,
        hasDiabetes: anamneseData.hasDiabetes || false,
        hasHypertension: anamneseData.hasHypertension || false,
        isPregnant: anamneseData.isPregnant || false,
        smokingHabits: anamneseData.smokingHabits || "",
        bleedingProblems: anamneseData.bleedingProblems || false,
        familyHistory: anamneseData.familyHistory || "",
      };
      
      // Get user from authentication
      const user = req.user;
      
      // Prepare data for database (remove individual fields, keep only the object)
      const finalData = {
        patientId: anamneseData.patientId,
        medicalTreatment: anamneseData.medicalTreatment,
        medications: anamneseData.medications,
        allergies: anamneseData.allergies,
        previousDentalTreatment: anamneseData.previousDentalTreatment,
        painComplaint: anamneseData.painComplaint,
        additionalQuestions: additionalQuestions,
        companyId: user.companyId
      };
      
      const anamnese = await storage.createAnamnese(finalData);
      res.json(anamnese);
    } catch (error) {
      console.error("Create anamnese error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/anamnese/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Debug: log the raw request body
      console.log("PUT anamnese request body:", JSON.stringify(req.body, null, 2));
      
      const anamneseData = insertAnamneseSchema.partial().parse(req.body);
      
      // Debug: log the parsed data
      console.log("PUT anamnese parsed data:", JSON.stringify(anamneseData, null, 2));
      
      // Get the existing anamnese record to preserve existing values
      const existingAnamnese = await storage.getAnamnese(anamneseData.patientId || 0);
      
      // Get user from authentication
      const user = req.user;
      
      let additionalQuestions;
      
      if (anamneseData.additionalQuestions) {
        // If additionalQuestions is provided in request, use it directly
        additionalQuestions = anamneseData.additionalQuestions;
      } else {
        // Otherwise, build from individual fields while preserving existing values
        const existingQuestions = existingAnamnese?.additionalQuestions || {};
        additionalQuestions = {
          hasHeartProblems: anamneseData.hasHeartProblems !== undefined ? anamneseData.hasHeartProblems : (existingQuestions.hasHeartProblems || false),
          hasDiabetes: anamneseData.hasDiabetes !== undefined ? anamneseData.hasDiabetes : (existingQuestions.hasDiabetes || false),
          hasHypertension: anamneseData.hasHypertension !== undefined ? anamneseData.hasHypertension : (existingQuestions.hasHypertension || false),
          isPregnant: anamneseData.isPregnant !== undefined ? anamneseData.isPregnant : (existingQuestions.isPregnant || false),
          smokingHabits: anamneseData.smokingHabits !== undefined ? anamneseData.smokingHabits : (existingQuestions.smokingHabits || ""),
          bleedingProblems: anamneseData.bleedingProblems !== undefined ? anamneseData.bleedingProblems : (existingQuestions.bleedingProblems || false),
          familyHistory: anamneseData.familyHistory !== undefined ? anamneseData.familyHistory : (existingQuestions.familyHistory || ""),
        };
      }
      
      // Prepare data for database (only include fields that are actually being updated)
      const finalData: any = {
        companyId: user.companyId,
        additionalQuestions: additionalQuestions
      };
      
      // Only include fields that are explicitly provided
      if (anamneseData.patientId !== undefined) finalData.patientId = anamneseData.patientId;
      if (anamneseData.medicalTreatment !== undefined) finalData.medicalTreatment = anamneseData.medicalTreatment;
      if (anamneseData.medications !== undefined) finalData.medications = anamneseData.medications;
      if (anamneseData.allergies !== undefined) finalData.allergies = anamneseData.allergies;
      if (anamneseData.previousDentalTreatment !== undefined) finalData.previousDentalTreatment = anamneseData.previousDentalTreatment;
      if (anamneseData.painComplaint !== undefined) finalData.painComplaint = anamneseData.painComplaint;
      
      console.log("PUT anamnese final data:", JSON.stringify(finalData, null, 2));
      
      const anamnese = await storage.updateAnamnese(id, finalData);
      
      console.log("PUT anamnese result:", JSON.stringify(anamnese, null, 2));
      
      res.json(anamnese);
    } catch (error) {
      console.error("Update anamnese error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Financial
  app.get("/api/financial", async (req, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      const status = req.query.status as string;
      
      const financial = await storage.getFinancial(patientId, status);
      res.json(financial);
    } catch (error) {
      console.error("Get financial error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/financial", async (req, res) => {
    try {
      const financialData = insertFinancialSchema.parse(req.body);
      const financial = await storage.createFinancialRecord(financialData);
      res.json(financial);
    } catch (error) {
      console.error("Create financial record error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/financial/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const financialData = insertFinancialSchema.partial().parse(req.body);
      const financial = await storage.updateFinancialRecord(id, financialData);
      res.json(financial);
    } catch (error) {
      console.error("Update financial record error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Receivables (Contas a Receber)
  app.get("/api/receivables", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      const dentistId = req.query.dentistId ? parseInt(req.query.dentistId as string) : undefined;
      const status = req.query.status as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Apply data scope filtering
      let receivablesResult;
      if (user.role === "admin" || user.dataScope === "all") {
        // CRITICAL: Always filter by company, even for admins and "all" scope users
        receivablesResult = await storage.getReceivables(patientId, status, startDate, endDate, dentistId, user.companyId);
      } else {
        // For users with "own" scope, filter by their appointments/consultations
        const userConsultations = await db.select({
          id: consultations.id,
          patientId: consultations.patientId,
          dentistId: consultations.dentistId,
        }).from(consultations)
          .where(eq(consultations.dentistId, user.id));

        const userAppointments = await db.select({
          id: appointments.id,
          patientId: appointments.patientId,
          dentistId: appointments.dentistId,
        }).from(appointments)
          .where(eq(appointments.dentistId, user.id));

        const consultationIds = userConsultations.map(c => c.id);
        const appointmentIds = userAppointments.map(a => a.id);

        if (consultationIds.length === 0 && appointmentIds.length === 0) {
          receivablesResult = [];
        } else {
          let whereConditions = [];
          
          if (patientId) whereConditions.push(eq(receivables.patientId, patientId));
          if (status) whereConditions.push(eq(receivables.status, status));
          if (startDate) whereConditions.push(sql`${receivables.dueDate} >= ${startDate}`);
          if (endDate) whereConditions.push(sql`${receivables.dueDate} <= ${endDate}`);

          const orConditions = [];
          if (consultationIds.length > 0) {
            orConditions.push(sql`${receivables.consultationId} IN (${consultationIds.join(',')})`);
          }
          if (appointmentIds.length > 0) {
            orConditions.push(sql`${receivables.appointmentId} IN (${appointmentIds.join(',')})`);
          }

          if (orConditions.length > 0) {
            whereConditions.push(or(...orConditions));
          }

          // CRITICAL: Always pass company ID for proper isolation
          receivablesResult = await storage.getReceivables(
            patientId, 
            status, 
            startDate, 
            endDate,
            dentistId,
            user.companyId
          );

          // Filter results to only include user's own data
          receivablesResult = receivablesResult.filter(r => 
            (r.consultationId && consultationIds.includes(r.consultationId)) ||
            (r.appointmentId && appointmentIds.includes(r.appointmentId))
          );
        }
      }
      
      res.json(receivablesResult);
    } catch (error) {
      console.error("Get receivables error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/receivables/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      
      // CRITICAL: Get receivable with company filtering
      const receivable = await storage.getReceivable(id, user.companyId);
      
      if (!receivable) {
        return res.status(404).json({ message: "Receivable not found" });
      }
      
      // Additional data scope check for "own" users
      if (user.role !== "admin" && user.dataScope === "own") {
        // Verify the receivable belongs to user's consultations/appointments
        if (receivable.consultation && receivable.consultation.dentistId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (receivable.appointment && receivable.appointment.dentistId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      res.json(receivable);
    } catch (error) {
      console.error("Get receivable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/receivables", authenticateToken, async (req, res) => {
    try {
      const receivableData = insertReceivableSchema.parse(req.body);
      const user = req.user;
      
      // CRITICAL: Add company ID to receivable data
      receivableData.companyId = user.companyId;
      
      // Verify patient belongs to user's company
      const patient = await storage.getPatient(receivableData.patientId);
      if (!patient || patient.companyId !== user.companyId) {
        return res.status(403).json({ message: "Patient not found or not from your company" });
      }
      
      const receivable = await storage.createReceivable(receivableData);
      res.json(receivable);
    } catch (error) {
      console.error("Create receivable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/receivables/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const receivableData = insertReceivableSchema.partial().parse(req.body);
      const user = req.user;
      
      // CRITICAL: Verify receivable belongs to user's company
      const existingReceivable = await storage.getReceivable(id, user.companyId);
      if (!existingReceivable) {
        return res.status(404).json({ message: "Receivable not found" });
      }
      
      const receivable = await storage.updateReceivable(id, receivableData);
      res.json(receivable);
    } catch (error) {
      console.error("Update receivable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/receivables/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      
      // CRITICAL: Verify receivable belongs to user's company
      const existingReceivable = await storage.getReceivable(id, user.companyId);
      if (!existingReceivable) {
        return res.status(404).json({ message: "Conta a receber não encontrada" });
      }
      
      await storage.deleteReceivable(id);
      res.json({ message: "Receivable deleted successfully" });
    } catch (error) {
      console.error("Delete receivable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Criar contas a receber a partir de consulta
  app.post("/api/receivables/from-consultation", authenticateToken, async (req, res) => {
    try {
      const { consultationId, procedureIds, installments = 1, customAmount, paymentMethod = 'pix', dueDate } = req.body;
      const user = req.user;
      
      // CRITICAL: Verify consultation belongs to user's company
      const consultation = await storage.getConsultation(consultationId, user.companyId);
      if (!consultation) {
        return res.status(404).json({ message: "Consulta não encontrada ou não pertence à sua empresa" });
      }
      
      const receivables = await storage.createReceivableFromConsultation(consultationId, procedureIds, installments, customAmount, paymentMethod, dueDate, user.companyId);
      res.json(receivables);
    } catch (error) {
      console.error("Create receivables from consultation error:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Payables (Contas a Pagar)
  app.get("/api/payables", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const status = req.query.status as string;
      const category = req.query.category as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Apply data scope filtering - only admin and "all" scope users can see payables
      if (user.role === "admin" || user.dataScope === "all") {
        // CRITICAL: Always filter by company, even for admins and "all" scope users
        const payables = await storage.getPayables(status, category, startDate, endDate, user.companyId);
        res.json(payables);
      } else {
        // Users with "own" scope cannot see payables (clinic expenses)
        res.json([]);
      }
    } catch (error) {
      console.error("Get payables error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/payables/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      
      // CRITICAL: Get payable with company filtering
      const payable = await storage.getPayable(id, user.companyId);
      
      if (!payable) {
        return res.status(404).json({ message: "Payable not found" });
      }
      
      res.json(payable);
    } catch (error) {
      console.error("Get payable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/payables", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const payableData = insertPayableSchema.parse(req.body);
      
      // Clean up empty strings to undefined/null for optional fields
      const cleanedData = {
        ...payableData,
        companyId: user.companyId, // CRITICAL: Add company ID
        paymentDate: payableData.paymentDate && payableData.paymentDate.trim() !== "" ? payableData.paymentDate : undefined,
        paymentMethod: payableData.paymentMethod && payableData.paymentMethod.trim() !== "" ? payableData.paymentMethod : undefined,
        supplier: payableData.supplier && payableData.supplier.trim() !== "" ? payableData.supplier : undefined,
        notes: payableData.notes && payableData.notes.trim() !== "" ? payableData.notes : undefined,
        dentistId: payableData.accountType === "dentist" ? payableData.dentistId : undefined,
        createdBy: user.id
      };
      
      const payable = await storage.createPayable(cleanedData);
      res.json(payable);
    } catch (error) {
      console.error("Create payable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/payables/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      const payableData = insertPayableSchema.partial().parse(req.body);
      
      // CRITICAL: Verify payable belongs to user's company
      const existingPayable = await storage.getPayable(id, user.companyId);
      if (!existingPayable) {
        return res.status(404).json({ message: "Payable not found" });
      }
      
      // Clean up empty strings to undefined/null for optional fields
      const cleanedData = {
        ...payableData,
        paymentDate: payableData.paymentDate && payableData.paymentDate.trim() !== "" ? payableData.paymentDate : undefined,
        paymentMethod: payableData.paymentMethod && payableData.paymentMethod.trim() !== "" ? payableData.paymentMethod : undefined,
        supplier: payableData.supplier && payableData.supplier.trim() !== "" ? payableData.supplier : undefined,
        notes: payableData.notes && payableData.notes.trim() !== "" ? payableData.notes : undefined,
        dentistId: payableData.accountType === "dentist" ? payableData.dentistId : undefined,
      };
      
      const payable = await storage.updatePayable(id, cleanedData);
      res.json(payable);
    } catch (error) {
      console.error("Update payable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/payables/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      
      // CRITICAL: Verify payable belongs to user's company
      const existingPayable = await storage.getPayable(id, user.companyId);
      if (!existingPayable) {
        return res.status(404).json({ message: "Conta a pagar não encontrada" });
      }
      
      await storage.deletePayable(id);
      res.json({ message: "Payable deleted successfully" });
    } catch (error) {
      console.error("Delete payable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cash Flow (Fluxo de Caixa)
  app.get("/api/cash-flow", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Apply data scope filtering
      if (user.role === "admin" || user.dataScope === "all") {
        // CRITICAL: Always filter by company, even for admins and "all" scope users
        const cashFlow = await storage.getCashFlow(startDate, endDate, user.companyId);
        res.json(cashFlow);
      } else {
        // Users with "own" scope only see cash flow from their own receivables
        let whereConditions = [];
        if (startDate) whereConditions.push(sql`${cashFlow.date} >= ${startDate}`);
        if (endDate) whereConditions.push(sql`${cashFlow.date} <= ${endDate}`);
        
        const userCashFlow = await db.select({
          id: cashFlow.id,
          type: cashFlow.type,
          amount: cashFlow.amount,
          description: cashFlow.description,
          date: cashFlow.date,
          category: cashFlow.category,
          receivableId: cashFlow.receivableId,
          payableId: cashFlow.payableId,
          createdAt: cashFlow.createdAt,
        }).from(cashFlow)
          .leftJoin(receivables, eq(cashFlow.receivableId, receivables.id))
          .leftJoin(consultations, eq(receivables.consultationId, consultations.id))
          .leftJoin(appointments, eq(receivables.appointmentId, appointments.id))
          .where(
            and(
              whereConditions.length > 0 ? and(...whereConditions) : undefined,
              or(
                eq(consultations.dentistId, user.id),
                eq(appointments.dentistId, user.id),
                isNull(cashFlow.receivableId) // Allow entries not related to receivables
              )
            )
          );
        
        res.json(userCashFlow);
      }
    } catch (error) {
      console.error("Get cash flow error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/financial-metrics", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Apply data scope filtering
      if (user.role === "admin" || user.dataScope === "all") {
        // CRITICAL: Always filter by company, even for admins and "all" scope users
        const metrics = await storage.getFinancialMetrics(startDate, endDate, user.companyId);
        res.json(metrics);
      } else {
        // Users with "own" scope only see metrics from their own data
        const whereReceivables = [];
        if (startDate) whereReceivables.push(sql`${receivables.dueDate} >= ${startDate}`);
        if (endDate) whereReceivables.push(sql`${receivables.dueDate} <= ${endDate}`);
        
        // Calculate metrics only for user's own receivables
        const userReceivablesQuery = db
          .select({ 
            amount: receivables.amount,
            status: receivables.status 
          })
          .from(receivables)
          .leftJoin(consultations, eq(receivables.consultationId, consultations.id))
          .leftJoin(appointments, eq(receivables.appointmentId, appointments.id))
          .where(
            and(
              whereReceivables.length > 0 ? and(...whereReceivables) : undefined,
              or(
                eq(consultations.dentistId, user.id),
                eq(appointments.dentistId, user.id)
              )
            )
          );
        
        const userReceivables = await userReceivablesQuery;
        
        const totalReceivables = userReceivables.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const totalReceived = userReceivables.filter(r => r.status === 'paid').reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const pendingReceivables = userReceivables.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount), 0);
        
        const metrics = {
          totalReceivables,
          totalPayables: 0, // Users with "own" scope don't see payables
          totalReceived,
          totalPaid: 0,
          pendingReceivables,
          pendingPayables: 0,
          currentBalance: totalReceived
        };
        
        res.json(metrics);
      }
    } catch (error) {
      console.error("Get financial metrics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/current-balance", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Apply data scope filtering
      if (user.role === "admin" || user.dataScope === "all") {
        // CRITICAL: Always filter by company, even for admins and "all" scope users
        const balance = await storage.getCurrentBalance(user.companyId);
        res.json({ balance });
      } else {
        // Users with "own" scope only see balance from their own receivables
        const userReceivablesQuery = db
          .select({ 
            amount: receivables.amount,
            status: receivables.status 
          })
          .from(receivables)
          .leftJoin(consultations, eq(receivables.consultationId, consultations.id))
          .leftJoin(appointments, eq(receivables.appointmentId, appointments.id))
          .where(
            and(
              eq(receivables.status, 'paid'),
              or(
                eq(consultations.dentistId, user.id),
                eq(appointments.dentistId, user.id)
              )
            )
          );
        
        const userReceivables = await userReceivablesQuery;
        const balance = userReceivables.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        
        res.json({ balance });
      }
    } catch (error) {
      console.error("Get current balance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Companies routes - only accessible to system admin
  // Check if user is system admin (no companyId)
  function requireSystemAdmin(req: any, res: any, next: any) {
    const user = req.user;
    
    // Only users with no companyId and admin role can access companies
    if (!user || user.companyId !== null || (user.role !== 'admin' && user.role !== 'Administrador')) {
      return res.status(403).json({ message: 'Access denied. System admin required.' });
    }
    
    next();
  }

  app.get("/api/companies", authenticateToken, requireSystemAdmin, async (req, res) => {
    try {
      const companiesList = await db.select().from(companies).orderBy(companies.name);
      res.json(companiesList);
    } catch (error) {
      console.error("Get companies error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/companies/:id", authenticateToken, requireSystemAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      
      if (company.length === 0) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company[0]);
    } catch (error) {
      console.error("Get company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/companies", authenticateToken, async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      
      // Clean up empty strings to undefined/null for optional fields
      const cleanedData = {
        ...companyData,
        tradeName: companyData.tradeName?.trim() || null,
        cnpj: companyData.cnpj?.trim() || null,
        cep: companyData.cep?.trim() || null,
        street: companyData.street?.trim() || null,
        number: companyData.number?.trim() || null,
        neighborhood: companyData.neighborhood?.trim() || null,
        city: companyData.city?.trim() || null,
        state: companyData.state?.trim() || null,
        trialEndDate: companyData.trialEndDate ? companyData.trialEndDate : null,
        subscriptionStartDate: companyData.subscriptionStartDate ? companyData.subscriptionStartDate : null,
        subscriptionEndDate: companyData.subscriptionEndDate ? companyData.subscriptionEndDate : null,
      };
      
      const [company] = await db.insert(companies).values(cleanedData).returning();
      res.json(company);
    } catch (error) {
      console.error("Create company error:", error);
      res.status(500).json({ message: "Internal server error", details: error.message });
    }
  });

  app.put("/api/companies/:id", authenticateToken, requireSystemAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const companyData = insertCompanySchema.partial().parse(req.body);
      
      // Clean up empty strings to undefined/null for optional fields
      const cleanedData = {
        ...companyData,
        tradeName: companyData.tradeName?.trim() || null,
        cnpj: companyData.cnpj?.trim() || null,
        cep: companyData.cep?.trim() || null,
        street: companyData.street?.trim() || null,
        number: companyData.number?.trim() || null,
        neighborhood: companyData.neighborhood?.trim() || null,
        city: companyData.city?.trim() || null,
        state: companyData.state?.trim() || null,
        trialEndDate: companyData.trialEndDate ? new Date(companyData.trialEndDate) : null,
        subscriptionStartDate: companyData.subscriptionStartDate ? new Date(companyData.subscriptionStartDate) : null,
        subscriptionEndDate: companyData.subscriptionEndDate ? new Date(companyData.subscriptionEndDate) : null,
        updatedAt: new Date(),
      };
      
      const company = await db.update(companies).set(cleanedData).where(eq(companies.id, id)).returning();
      
      if (company.length === 0) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company[0]);
    } catch (error) {
      console.error("Update company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/companies/:id", authenticateToken, requireSystemAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if company has associated users or patients
      const usersCount = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.companyId, id));
      const patientsCount = await db.select({ count: sql`count(*)` }).from(patients).where(eq(patients.companyId, id));
      
      if (parseInt(usersCount[0].count as string) > 0 || parseInt(patientsCount[0].count as string) > 0) {
        return res.status(400).json({ 
          message: "Cannot delete company with associated users or patients. Please transfer or remove them first." 
        });
      }
      
      const result = await db.delete(companies).where(eq(companies.id, id)).returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Companies routes
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Get companies error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Get company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      
      // Convert date strings to Date objects if they exist
      const processedData = {
        ...companyData,
        trialEndDate: companyData.trialEndDate ? companyData.trialEndDate : undefined,
        subscriptionStartDate: companyData.subscriptionStartDate ? companyData.subscriptionStartDate : undefined,
        subscriptionEndDate: companyData.subscriptionEndDate ? companyData.subscriptionEndDate : undefined,
      };
      
      // Create company with automatic admin user
      const result = await storage.createCompanyWithAdmin(processedData);
      
      res.status(201).json({
        company: result.company,
        adminUser: {
          id: result.adminUser.id,
          username: result.adminUser.username,
          name: result.adminUser.name,
          email: result.adminUser.email,
          // Note: Do not return the password in production
          generatedPassword: `${companyData.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}123`
        }
      });
    } catch (error) {
      console.error("Create company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const companyData = insertCompanySchema.partial().parse(req.body);
      
      // Convert date strings to Date objects if they exist  
      const processedData = {
        ...companyData,
        trialEndDate: companyData.trialEndDate ? companyData.trialEndDate : undefined,
        subscriptionStartDate: companyData.subscriptionStartDate ? companyData.subscriptionStartDate : undefined,
        subscriptionEndDate: companyData.subscriptionEndDate ? companyData.subscriptionEndDate : undefined,
      };
      
      const company = await storage.updateCompany(id, processedData);
      res.json(company);
    } catch (error) {
      console.error("Update company error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
