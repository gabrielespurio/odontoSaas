import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertProcedureSchema, 
  insertAppointmentSchema, 
  insertConsultationSchema, 
  insertDentalChartSchema, 
  insertAnamneseSchema, 
  insertFinancialSchema,
  insertProcedureCategorySchema
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
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
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
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
        { id: user.id, username: user.username, role: user.role },
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
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
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
  app.get("/api/patients", async (req, res) => {
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
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
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
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get dentists only
  app.get("/api/users/dentists", async (req, res) => {
    try {
      const dentistsData = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      }).from(users).where(and(eq(users.role, "dentist"), eq(users.isActive, true))).orderBy(users.name);
      res.json(dentistsData);
    } catch (error) {
      console.error("Get dentists error:", error);
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
  app.get("/api/appointments", async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const dentistId = req.query.dentistId ? parseInt(req.query.dentistId as string) : undefined;
      
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

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const appointmentData = insertAppointmentSchema.partial().parse(req.body);
      
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
      res.json(appointment);
    } catch (error) {
      console.error("Update appointment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Consultations
  app.get("/api/consultations", async (req, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      const dentistId = req.query.dentistId ? parseInt(req.query.dentistId as string) : undefined;
      
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
      
      const consultation = await storage.updateConsultation(id, consultationData);
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

  const httpServer = createServer(app);
  return httpServer;
}
