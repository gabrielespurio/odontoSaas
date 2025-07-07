import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  insertFinancialSchema 
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
      const dentistId = req.query.dentistId ? parseInt(req.query.dentistId as string) : undefined;
      
      const appointments = await storage.getAppointments(date, dentistId);
      res.json(appointments);
    } catch (error) {
      console.error("Get appointments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
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
      const consultation = await storage.createConsultation(consultationData);
      res.json(consultation);
    } catch (error) {
      console.error("Create consultation error:", error);
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
      const dentalChartData = insertDentalChartSchema.parse(req.body);
      
      const updatedTooth = await storage.updateToothCondition(patientId, toothNumber, dentalChartData);
      res.json(updatedTooth);
    } catch (error) {
      console.error("Update tooth condition error:", error);
      res.status(500).json({ message: "Internal server error" });
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
