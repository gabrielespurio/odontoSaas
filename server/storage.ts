import {
  users,
  patients,
  procedures,
  appointments,
  consultations,
  dentalChart,
  anamnese,
  financial,
  procedureCategories,
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type Procedure,
  type InsertProcedure,
  type Appointment,
  type InsertAppointment,
  type Consultation,
  type InsertConsultation,
  type DentalChart,
  type InsertDentalChart,
  type Anamnese,
  type InsertAnamnese,
  type Financial,
  type InsertFinancial,
  type ProcedureCategory,
  type InsertProcedureCategory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Patients
  getPatients(limit?: number, offset?: number, search?: string): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  
  // Procedure Categories
  getProcedureCategories(): Promise<ProcedureCategory[]>;
  getProcedureCategory(id: number): Promise<ProcedureCategory | undefined>;
  createProcedureCategory(category: InsertProcedureCategory): Promise<ProcedureCategory>;
  updateProcedureCategory(id: number, category: Partial<InsertProcedureCategory>): Promise<ProcedureCategory>;
  
  // Procedures
  getProcedures(): Promise<Procedure[]>;
  getProcedure(id: number): Promise<Procedure | undefined>;
  createProcedure(procedure: InsertProcedure): Promise<Procedure>;
  updateProcedure(id: number, procedure: Partial<InsertProcedure>): Promise<Procedure>;
  
  // Appointments
  getAppointments(date?: Date, dentistId?: number, startDate?: Date, endDate?: Date): Promise<(Appointment & { patient: Patient; dentist: User; procedure: Procedure })[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  
  // Consultations
  getConsultations(patientId?: number, dentistId?: number): Promise<(Consultation & { patient: Patient; dentist: User })[]>;
  getConsultation(id: number): Promise<Consultation | undefined>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: number, consultation: Partial<InsertConsultation>): Promise<Consultation>;
  
  // Dental Chart
  getDentalChart(patientId: number): Promise<DentalChart[]>;
  updateToothCondition(patientId: number, toothNumber: string, condition: InsertDentalChart): Promise<DentalChart>;
  
  // Anamnese
  getAnamnese(patientId: number): Promise<Anamnese | undefined>;
  createAnamnese(anamnese: InsertAnamnese): Promise<Anamnese>;
  updateAnamnese(id: number, anamnese: Partial<InsertAnamnese>): Promise<Anamnese>;
  
  // Financial
  getFinancial(patientId?: number, status?: string): Promise<(Financial & { patient: Patient })[]>;
  getFinancialRecord(id: number): Promise<Financial | undefined>;
  createFinancialRecord(financial: InsertFinancial): Promise<Financial>;
  updateFinancialRecord(id: number, financial: Partial<InsertFinancial>): Promise<Financial>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    todayAppointments: number;
    activePatients: number;
    monthlyRevenue: number;
    pendingPayments: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, insertUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(insertUser).where(eq(users.id, id)).returning();
    return user;
  }

  // Patients
  async getPatients(limit = 50, offset = 0, search?: string): Promise<Patient[]> {
    let whereCondition = eq(patients.isActive, true);
    
    if (search) {
      whereCondition = and(
        whereCondition,
        or(
          ilike(patients.name, `%${search}%`),
          ilike(patients.cpf, `%${search}%`),
          ilike(patients.phone, `%${search}%`)
        )
      ) || whereCondition;
    }
    
    return await db.select().from(patients).where(whereCondition).limit(limit).offset(offset).orderBy(desc(patients.createdAt));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: number, insertPatient: Partial<InsertPatient>): Promise<Patient> {
    const [patient] = await db.update(patients).set(insertPatient).where(eq(patients.id, id)).returning();
    return patient;
  }

  // Procedure Categories
  async getProcedureCategories(): Promise<ProcedureCategory[]> {
    return await db.select().from(procedureCategories).where(eq(procedureCategories.isActive, true)).orderBy(procedureCategories.name);
  }

  async getProcedureCategory(id: number): Promise<ProcedureCategory | undefined> {
    const [category] = await db.select().from(procedureCategories).where(eq(procedureCategories.id, id));
    return category || undefined;
  }

  async createProcedureCategory(insertProcedureCategory: InsertProcedureCategory): Promise<ProcedureCategory> {
    const [category] = await db.insert(procedureCategories).values(insertProcedureCategory).returning();
    return category;
  }

  async updateProcedureCategory(id: number, insertProcedureCategory: Partial<InsertProcedureCategory>): Promise<ProcedureCategory> {
    const [category] = await db.update(procedureCategories).set(insertProcedureCategory).where(eq(procedureCategories.id, id)).returning();
    return category;
  }

  // Procedures
  async getProcedures(): Promise<Procedure[]> {
    return await db.select().from(procedures).where(eq(procedures.isActive, true)).orderBy(procedures.name);
  }

  async getProcedure(id: number): Promise<Procedure | undefined> {
    const [procedure] = await db.select().from(procedures).where(eq(procedures.id, id));
    return procedure || undefined;
  }

  async createProcedure(insertProcedure: InsertProcedure): Promise<Procedure> {
    const [procedure] = await db.insert(procedures).values(insertProcedure).returning();
    return procedure;
  }

  async updateProcedure(id: number, insertProcedure: Partial<InsertProcedure>): Promise<Procedure> {
    const [procedure] = await db.update(procedures).set(insertProcedure).where(eq(procedures.id, id)).returning();
    return procedure;
  }

  // Appointments
  async getAppointments(date?: Date, dentistId?: number, startDate?: Date, endDate?: Date): Promise<(Appointment & { patient: Patient; dentist: User; procedure: Procedure })[]> {
    let whereConditions = [];

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereConditions.push(
        sql`${appointments.scheduledDate} >= ${startOfDay}`,
        sql`${appointments.scheduledDate} <= ${endOfDay}`
      );
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      whereConditions.push(
        sql`${appointments.scheduledDate} >= ${start}`,
        sql`${appointments.scheduledDate} <= ${end}`
      );
    }

    if (dentistId) {
      whereConditions.push(eq(appointments.dentistId, dentistId));
    }

    let query = db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      dentistId: appointments.dentistId,
      procedureId: appointments.procedureId,
      scheduledDate: appointments.scheduledDate,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      patient: patients,
      dentist: users,
      procedure: procedures,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.dentistId, users.id))
    .innerJoin(procedures, eq(appointments.procedureId, procedures.id));

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!) as any;
    }

    return await query.orderBy(appointments.scheduledDate);
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }

  async updateAppointment(id: number, insertAppointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [appointment] = await db.update(appointments).set(insertAppointment).where(eq(appointments.id, id)).returning();
    return appointment;
  }

  // Consultations
  async getConsultations(patientId?: number, dentistId?: number): Promise<(Consultation & { patient: Patient; dentist: User })[]> {
    let whereConditions = [];

    if (patientId) {
      whereConditions.push(eq(consultations.patientId, patientId));
    }

    if (dentistId) {
      whereConditions.push(eq(consultations.dentistId, dentistId));
    }

    let query = db.select({
      id: consultations.id,
      patientId: consultations.patientId,
      dentistId: consultations.dentistId,
      appointmentId: consultations.appointmentId,
      date: consultations.date,
      procedures: consultations.procedures,
      clinicalNotes: consultations.clinicalNotes,
      observations: consultations.observations,
      createdAt: consultations.createdAt,
      patient: patients,
      dentist: users,
    })
    .from(consultations)
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .innerJoin(users, eq(consultations.dentistId, users.id));

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!) as any;
    }

    return await query.orderBy(desc(consultations.date));
  }

  async getConsultation(id: number): Promise<Consultation | undefined> {
    const [consultation] = await db.select().from(consultations).where(eq(consultations.id, id));
    return consultation || undefined;
  }

  async createConsultation(insertConsultation: InsertConsultation): Promise<Consultation> {
    const [consultation] = await db.insert(consultations).values(insertConsultation).returning();
    return consultation;
  }

  async updateConsultation(id: number, insertConsultation: Partial<InsertConsultation>): Promise<Consultation> {
    const [consultation] = await db.update(consultations).set(insertConsultation).where(eq(consultations.id, id)).returning();
    return consultation;
  }

  // Dental Chart
  async getDentalChart(patientId: number): Promise<DentalChart[]> {
    // Get all records ordered by creation date (newest first) for history display
    return await db.select().from(dentalChart)
      .where(eq(dentalChart.patientId, patientId))
      .orderBy(dentalChart.createdAt);
  }

  async updateToothCondition(patientId: number, toothNumber: string, insertDentalChart: InsertDentalChart): Promise<DentalChart> {
    // Always create a new record to maintain history
    const [created] = await db.insert(dentalChart)
      .values({ 
        ...insertDentalChart, 
        patientId, 
        toothNumber
      })
      .returning();
    return created;
  }

  // Anamnese
  async getAnamnese(patientId: number): Promise<Anamnese | undefined> {
    const [record] = await db.select().from(anamnese).where(eq(anamnese.patientId, patientId));
    return record || undefined;
  }

  async createAnamnese(insertAnamnese: InsertAnamnese): Promise<Anamnese> {
    const [record] = await db.insert(anamnese).values(insertAnamnese).returning();
    return record;
  }

  async updateAnamnese(id: number, insertAnamnese: Partial<InsertAnamnese>): Promise<Anamnese> {
    const [record] = await db.update(anamnese).set(insertAnamnese).where(eq(anamnese.id, id)).returning();
    return record;
  }

  // Financial
  async getFinancial(patientId?: number, status?: string): Promise<(Financial & { patient: Patient })[]> {
    let whereConditions = [];

    if (patientId) {
      whereConditions.push(eq(financial.patientId, patientId));
    }

    if (status) {
      whereConditions.push(eq(financial.status, status as any));
    }

    let query = db.select({
      id: financial.id,
      patientId: financial.patientId,
      consultationId: financial.consultationId,
      appointmentId: financial.appointmentId,
      amount: financial.amount,
      dueDate: financial.dueDate,
      paymentDate: financial.paymentDate,
      paymentMethod: financial.paymentMethod,
      status: financial.status,
      description: financial.description,
      createdAt: financial.createdAt,
      updatedAt: financial.updatedAt,
      patient: patients,
    })
    .from(financial)
    .innerJoin(patients, eq(financial.patientId, patients.id));

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!) as any;
    }

    return await query.orderBy(desc(financial.dueDate));
  }

  async getFinancialRecord(id: number): Promise<Financial | undefined> {
    const [record] = await db.select().from(financial).where(eq(financial.id, id));
    return record || undefined;
  }

  async createFinancialRecord(insertFinancial: InsertFinancial): Promise<Financial> {
    const [record] = await db.insert(financial).values(insertFinancial).returning();
    return record;
  }

  async updateFinancialRecord(id: number, insertFinancial: Partial<InsertFinancial>): Promise<Financial> {
    const [record] = await db.update(financial).set(insertFinancial).where(eq(financial.id, id)).returning();
    return record;
  }

  // Dashboard metrics
  async getDashboardMetrics(): Promise<{
    todayAppointments: number;
    activePatients: number;
    monthlyRevenue: number;
    pendingPayments: number;
  }> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [todayAppointmentsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          sql`${appointments.scheduledDate} >= ${startOfDay}`,
          sql`${appointments.scheduledDate} <= ${endOfDay}`
        )
      );

    const [activePatientsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.isActive, true));

    const [monthlyRevenueResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${financial.amount}), 0)` })
      .from(financial)
      .where(
        and(
          eq(financial.status, "paid"),
          sql`${financial.paymentDate} >= ${startOfMonth}`,
          sql`${financial.paymentDate} <= ${endOfMonth}`
        )
      );

    const [pendingPaymentsResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${financial.amount}), 0)` })
      .from(financial)
      .where(eq(financial.status, "pending"));

    return {
      todayAppointments: todayAppointmentsResult.count,
      activePatients: activePatientsResult.count,
      monthlyRevenue: monthlyRevenueResult.sum,
      pendingPayments: pendingPaymentsResult.sum,
    };
  }
}

export const storage = new DatabaseStorage();
