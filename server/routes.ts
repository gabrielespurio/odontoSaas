import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, or, sql, isNull, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
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
  cashFlow
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
      
      // Try to find user by email first, fallback to username for existing users
      let user = await storage.getUserByEmail ? await storage.getUserByEmail(email) : null;
      if (!user) {
        user = await storage.getUserByUsername(email);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

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

  // Protected routes
  app.use("/api", authenticateToken);

  // Dashboard
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
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
      
      const patients = await storage.getPatients(limit, offset, search);
      res.json(patients);
    } catch (error) {
      console.error("Get patients error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.getPatient(id);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Get patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(patientData);
      res.json(patient);
    } catch (error) {
      console.error("Create patient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patientData = insertPatientSchema.partial().parse(req.body);
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
  app.get("/api/users", async (req, res) => {
    try {
      const usersData = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        dataScope: users.dataScope,
        createdAt: users.createdAt,
      }).from(users).orderBy(users.name);
      res.json(usersData);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
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
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Generate username from email (part before @)
      const username = userData.email.split('@')[0];
      
      // Create user with forcePasswordChange
      const userToCreate = {
        ...userData,
        username,
        password: hashedPassword,
        forcePasswordChange: userData.forcePasswordChange || false,
      };
      
      const user = await storage.createUser(userToCreate);
      
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        dataScope: user.dataScope,
        forcePasswordChange: user.forcePasswordChange,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Create user error:", error);
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
        username: user.username,
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
  app.get("/api/procedure-categories", async (req, res) => {
    try {
      const categories = await storage.getProcedureCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get procedure categories error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/procedure-categories", async (req, res) => {
    try {
      const categoryData = insertProcedureCategorySchema.parse(req.body);
      const category = await storage.createProcedureCategory(categoryData);
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
  app.get("/api/user-profiles", async (req, res) => {
    try {
      const profiles = await storage.getUserProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Get user profiles error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user-profiles", async (req, res) => {
    try {
      const profileData = insertUserProfileSchema.parse(req.body);
      const profile = await storage.createUserProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Create user profile error:", error);
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
  app.get("/api/procedures", async (req, res) => {
    try {
      const procedures = await storage.getProcedures();
      res.json(procedures);
    } catch (error) {
      console.error("Get procedures error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/procedures", async (req, res) => {
    try {
      const procedureData = insertProcedureSchema.parse(req.body);
      const procedure = await storage.createProcedure(procedureData);
      res.json(procedure);
    } catch (error) {
      console.error("Create procedure error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/procedures/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const procedureData = insertProcedureSchema.partial().parse(req.body);
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
      
      const appointments = await storage.getAppointments(date, dentistId, startDate, endDate);
      res.json(appointments);
    } catch (error) {
      console.error("Get appointments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      
      // Validar se o horário está disponível considerando a duração dos procedimentos
      const scheduledDate = new Date(appointmentData.scheduledDate);
      const newStartTime = scheduledDate.getTime();
      
      // Buscar todos os agendamentos do mesmo dia e dentista
      const existingAppointments = await storage.getAppointments(scheduledDate, appointmentData.dentistId);
      
      // Verificar se o novo horário conflita com algum procedimento em andamento
      const conflictingAppointment = existingAppointments.find(apt => {
        const aptDate = new Date(apt.scheduledDate);
        const aptStartTime = aptDate.getTime();
        const aptEndTime = aptStartTime + (apt.procedure.duration * 60 * 1000); // duração em minutos para millisegundos
        
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
      
      const appointment = await storage.createAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Create appointment error:", error);
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

  // Endpoint para buscar agendamentos que não têm consulta correspondente
  app.get("/api/appointments-without-consultation", authenticateToken, async (req, res) => {
    try {
      // Apply data scope control
      const user = req.user;
      let whereConditions = [isNull(consultations.id)];
      
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
      .leftJoin(consultations, and(
        eq(appointments.patientId, consultations.patientId),
        eq(appointments.dentistId, consultations.dentistId),
        sql`DATE(${appointments.scheduledDate}) = DATE(${consultations.date})`
      ))
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
      const appointmentData = insertAppointmentSchema.partial().parse(req.body);
      
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

  // Consultations
  app.get("/api/consultations", authenticateToken, async (req, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      let dentistId = req.query.dentistId ? parseInt(req.query.dentistId as string) : undefined;
      
      // Apply data scope control
      const user = req.user;
      if (user.role !== "admin" && user.dataScope === "own") {
        // Users with "own" scope can only see their own consultations
        dentistId = user.id;
      }
      
      const consultations = await storage.getConsultations(patientId, dentistId);
      res.json(consultations);
    } catch (error) {
      console.error("Get consultations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/consultations", async (req, res) => {
    try {
      const consultationData = insertConsultationSchema.parse(req.body);
      
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
                patientId: consultationData.patientId,
                dentistId: consultationData.dentistId,
                procedureId: procedure.id,
                scheduledDate: currentDateTime,
                status: "confirmed" as const,
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

  app.put("/api/consultations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const consultationData = insertConsultationSchema.partial().parse(req.body);
      
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
      
      // Buscar a consulta atual
      const currentConsultation = await storage.getConsultation(id);
      
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

  // Dental Chart
  app.get("/api/dental-chart/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const dentalChart = await storage.getDentalChart(patientId);
      res.json(dentalChart);
    } catch (error) {
      console.error("Get dental chart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/dental-chart/:patientId/:toothNumber", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const toothNumber = req.params.toothNumber;
      
      // Create the data with required fields
      const dentalChartData = {
        patientId: patientId,
        toothNumber: toothNumber,
        condition: req.body.condition || "healthy",
        notes: req.body.notes || "",
        treatmentDate: req.body.treatmentDate || new Date().toISOString().split('T')[0]
      };
      
      console.log('Received dental chart update:', dentalChartData);
      
      const validatedData = insertDentalChartSchema.parse(dentalChartData);
      const updatedTooth = await storage.updateToothCondition(patientId, toothNumber, validatedData);
      res.json(updatedTooth);
    } catch (error) {
      console.error("Update tooth condition error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Anamnese
  app.get("/api/anamnese/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const anamnese = await storage.getAnamnese(patientId);
      res.json(anamnese);
    } catch (error) {
      console.error("Get anamnese error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/anamnese", async (req, res) => {
    try {
      const anamneseData = insertAnamneseSchema.parse(req.body);
      const anamnese = await storage.createAnamnese(anamneseData);
      res.json(anamnese);
    } catch (error) {
      console.error("Create anamnese error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/anamnese/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const anamneseData = insertAnamneseSchema.partial().parse(req.body);
      const anamnese = await storage.updateAnamnese(id, anamneseData);
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
      const status = req.query.status as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Apply data scope filtering
      let receivablesResult;
      if (user.role === "admin" || user.dataScope === "all") {
        receivablesResult = await storage.getReceivables(patientId, status, startDate, endDate);
      } else {
        // For users with "own" scope, filter by their appointments/consultations
        receivablesResult = await db.select({
          id: receivables.id,
          patientId: receivables.patientId,
          consultationId: receivables.consultationId,
          appointmentId: receivables.appointmentId,
          amount: receivables.amount,
          dueDate: receivables.dueDate,
          status: receivables.status,
          description: receivables.description,
          installment: receivables.installment,
          totalInstallments: receivables.totalInstallments,
          createdAt: receivables.createdAt,
          patient: {
            id: patients.id,
            name: patients.name,
            email: patients.email,
            phone: patients.phone,
          },
          consultationId: consultations.id,
          consultationDentistId: consultations.dentistId,
          appointmentId: appointments.id,
          appointmentDentistId: appointments.dentistId,
        }).from(receivables)
          .leftJoin(patients, eq(receivables.patientId, patients.id))
          .leftJoin(consultations, eq(receivables.consultationId, consultations.id))
          .leftJoin(appointments, eq(receivables.appointmentId, appointments.id))
          .where(
            and(
              patientId ? eq(receivables.patientId, patientId) : undefined,
              status ? eq(receivables.status, status) : undefined,
              startDate ? sql`${receivables.dueDate} >= ${startDate}` : undefined,
              endDate ? sql`${receivables.dueDate} <= ${endDate}` : undefined,
              or(
                eq(consultations.dentistId, user.id),
                eq(appointments.dentistId, user.id)
              )
            )
          );
      }
      
      res.json(receivablesResult);
    } catch (error) {
      console.error("Get receivables error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/receivables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const receivable = await storage.getReceivable(id);
      
      if (!receivable) {
        return res.status(404).json({ message: "Receivable not found" });
      }
      
      res.json(receivable);
    } catch (error) {
      console.error("Get receivable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/receivables", async (req, res) => {
    try {
      const receivableData = insertReceivableSchema.parse(req.body);
      const receivable = await storage.createReceivable(receivableData);
      res.json(receivable);
    } catch (error) {
      console.error("Create receivable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/receivables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const receivableData = insertReceivableSchema.partial().parse(req.body);
      const receivable = await storage.updateReceivable(id, receivableData);
      res.json(receivable);
    } catch (error) {
      console.error("Update receivable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Criar contas a receber a partir de consulta
  app.post("/api/receivables/from-consultation", async (req, res) => {
    try {
      const { consultationId, procedureIds, installments = 1, customAmount } = req.body;
      const receivables = await storage.createReceivableFromConsultation(consultationId, procedureIds, installments, customAmount);
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
        const payables = await storage.getPayables(status, category, startDate, endDate);
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

  app.get("/api/payables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payable = await storage.getPayable(id);
      
      if (!payable) {
        return res.status(404).json({ message: "Payable not found" });
      }
      
      res.json(payable);
    } catch (error) {
      console.error("Get payable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/payables", async (req, res) => {
    try {
      const payableData = insertPayableSchema.parse(req.body);
      const payable = await storage.createPayable(payableData);
      res.json(payable);
    } catch (error) {
      console.error("Create payable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/payables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payableData = insertPayableSchema.partial().parse(req.body);
      const payable = await storage.updatePayable(id, payableData);
      res.json(payable);
    } catch (error) {
      console.error("Update payable error:", error);
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
        const cashFlow = await storage.getCashFlow(startDate, endDate);
        res.json(cashFlow);
      } else {
        // Users with "own" scope only see cash flow from their own receivables
        let whereConditions = [];
        if (startDate) whereConditions.push(sql`${cashFlow.date} >= ${startDate}`);
        if (endDate) whereConditions.push(sql`${cashFlow.date} <= ${endDate}`);
        
        const userCashFlow = await db.select().from(cashFlow)
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
        
        res.json(userCashFlow.map(row => row.cash_flow));
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
        const metrics = await storage.getFinancialMetrics(startDate, endDate);
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
        const balance = await storage.getCurrentBalance();
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

  const httpServer = createServer(app);
  return httpServer;
}
