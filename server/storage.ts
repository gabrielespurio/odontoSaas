import {
  companies,
  users,
  patients,
  procedures,
  appointments,
  consultations,
  dentalChart,
  anamnese,
  financial,
  procedureCategories,
  userProfiles,
  receivables,
  payables,
  cashFlow,
  type Company,
  type InsertCompany,
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
  type UserProfile,
  type InsertUserProfile,
  type Receivable,
  type InsertReceivable,
  type Payable,
  type InsertPayable,
  type CashFlow,
  type InsertCashFlow,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, ne, not, gte, lte, like, lt, gt, isNull, asc } from "drizzle-orm";

export interface IStorage {
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company>;
  createCompanyWithAdmin(company: InsertCompany): Promise<{ company: Company; adminUser: User }>;
  
  // Users
  getUser(id: number): Promise<User | undefined>;

  getUserByEmail?(email: string): Promise<User | undefined>;
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
  
  // User Profiles
  getUserProfiles(): Promise<UserProfile[]>;
  getUserProfile(id: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  // Procedures
  getProcedures(): Promise<Procedure[]>;
  getProcedure(id: number): Promise<Procedure | undefined>;
  createProcedure(procedure: InsertProcedure): Promise<Procedure>;
  updateProcedure(id: number, procedure: Partial<InsertProcedure>): Promise<Procedure>;
  
  // Appointments
  getAppointments(date?: Date, dentistId?: number, startDate?: Date, endDate?: Date): Promise<(Appointment & { patient: Patient; dentist: User; procedure: Procedure })[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment & { patient: Patient; dentist: User; procedure: Procedure }>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  cancelAllAppointments(): Promise<{ count: number }>;
  cleanupCancelledAppointments(): Promise<{ count: number }>;
  isSlotAvailable(dentistId: number, scheduledDate: Date, procedureId: number, excludeId?: number): Promise<{ available: boolean; conflictMessage?: string }>;
  checkAppointmentConflicts(appointmentData: InsertAppointment, tx?: any, excludeId?: number): Promise<{ hasConflict: boolean; message: string }>;
  
  // Consultations
  getConsultations(patientId?: number, dentistId?: number, status?: string, companyId?: number): Promise<(Consultation & { patient: Patient; dentist: User })[]>;
  getConsultation(id: number, companyId?: number): Promise<Consultation | undefined>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: number, consultation: Partial<InsertConsultation>): Promise<Consultation>;
  deleteConsultation(id: number): Promise<void>;
  
  // Dental Chart
  getDentalChart(patientId: number): Promise<DentalChart[]>;
  updateToothCondition(patientId: number, toothNumber: string, condition: InsertDentalChart): Promise<DentalChart>;
  
  // Anamnese
  getAnamnese(patientId: number): Promise<Anamnese | undefined>;
  createAnamnese(anamnese: InsertAnamnese): Promise<Anamnese>;
  updateAnamnese(id: number, anamnese: Partial<InsertAnamnese>): Promise<Anamnese>;
  
  // Financial (deprecated - mantido para compatibilidade)
  getFinancial(patientId?: number, status?: string): Promise<(Financial & { patient: Patient })[]>;
  getFinancialRecord(id: number): Promise<Financial | undefined>;
  createFinancialRecord(financial: InsertFinancial): Promise<Financial>;
  updateFinancialRecord(id: number, financial: Partial<InsertFinancial>): Promise<Financial>;
  
  // Receivables (Contas a Receber)
  getReceivables(patientId?: number, status?: string, startDate?: Date, endDate?: Date): Promise<(Receivable & { patient: Patient; consultation?: Consultation; appointment?: Appointment })[]>;
  getReceivable(id: number): Promise<Receivable | undefined>;
  createReceivable(receivable: InsertReceivable): Promise<Receivable>;
  updateReceivable(id: number, receivable: Partial<InsertReceivable>): Promise<Receivable>;
  deleteReceivable(id: number): Promise<void>;
  createReceivableFromConsultation(consultationId: number, procedures: number[], installments?: number): Promise<Receivable[]>;
  
  // Payables (Contas a Pagar)
  getPayables(status?: string, category?: string, startDate?: Date, endDate?: Date): Promise<Payable[]>;
  getPayable(id: number): Promise<Payable | undefined>;
  createPayable(payable: InsertPayable): Promise<Payable>;
  updatePayable(id: number, payable: Partial<InsertPayable>): Promise<Payable>;
  
  // Cash Flow (Fluxo de Caixa)
  getCashFlow(startDate?: Date, endDate?: Date): Promise<CashFlow[]>;
  createCashFlowEntry(cashFlow: InsertCashFlow): Promise<CashFlow>;
  getCurrentBalance(): Promise<number>;
  getFinancialMetrics(startDate?: Date, endDate?: Date): Promise<{
    totalReceivables: number;
    totalPayables: number;
    totalReceived: number;
    totalPaid: number;
    pendingReceivables: number;
    pendingPayables: number;
    currentBalance: number;
  }>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    todayAppointments: number;
    activePatients: number;
    monthlyRevenue: number;
    pendingPayments: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Companies
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set(company)
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  async createCompanyWithAdmin(company: InsertCompany): Promise<{ company: Company; adminUser: User }> {
    // Create company first
    const [newCompany] = await db.insert(companies).values(company).returning();
    
    // Create admin profile for this company
    const [adminProfile] = await db.insert(userProfiles).values({
      companyId: newCompany.id,
      name: "Administrador",
      description: "Perfil administrativo com acesso total ao sistema",
      modules: ["dashboard", "patients", "appointments", "consultations", "procedures", "financial", "reports", "settings", "companies"],
      isActive: true,
    }).returning();
    
    // Generate admin password based on company
    const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    const adminPassword = `${companySlug}123`;
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Generate unique username for admin
    const baseUsername = company.email.split('@')[0];
    const adminUsername = `admin_${baseUsername}_c${newCompany.id}`;
    
    // Create admin user
    const [adminUser] = await db.insert(users).values({
      username: adminUsername,
      password: hashedPassword,
      name: "Administrador",
      email: company.email,
      role: "Administrador",
      companyId: newCompany.id,
      isActive: true,
      forcePasswordChange: true, // Force password change on first login
      dataScope: "all",
    }).returning();
    
    return { 
      company: newCompany, 
      adminUser: {
        ...adminUser,
        generatedPassword: adminPassword // Add generated password for display
      }
    };
  }
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }



  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmailAndCompany(email: string, companyId?: number | null): Promise<User | undefined> {
    if (!companyId) {
      // For system admins (no company), check global uniqueness
      return this.getUserByEmail(email);
    }
    
    const [user] = await db.select().from(users).where(
      and(
        eq(users.email, email),
        eq(users.companyId, companyId)
      )
    );
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
  async getPatients(limit = 50, offset = 0, search?: string, companyId?: number): Promise<Patient[]> {
    let whereConditions = [eq(patients.isActive, true)];
    
    // Add company filter for data isolation
    if (companyId) {
      whereConditions.push(eq(patients.companyId, companyId));
    }
    
    if (search) {
      whereConditions.push(
        or(
          ilike(patients.name, `%${search}%`),
          ilike(patients.cpf, `%${search}%`),
          ilike(patients.phone, `%${search}%`)
        )
      );
    }
    
    const whereCondition = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];
    
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
  async getProcedureCategories(companyId?: number): Promise<ProcedureCategory[]> {
    const whereConditions = [eq(procedureCategories.isActive, true)];
    if (companyId) {
      whereConditions.push(eq(procedureCategories.companyId, companyId));
    }
    return await db.select().from(procedureCategories).where(and(...whereConditions)).orderBy(procedureCategories.name);
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

  // User Profiles  
  async getUserProfiles(companyId?: number): Promise<UserProfile[]> {
    const whereConditions = [eq(userProfiles.isActive, true)];
    if (companyId) {
      whereConditions.push(eq(userProfiles.companyId, companyId));
    }
    return await db.select().from(userProfiles).where(and(...whereConditions)).orderBy(userProfiles.name);
  }

  async getUserProfile(id: number): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    return profile || undefined;
  }

  async createUserProfile(insertUserProfile: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db.insert(userProfiles).values(insertUserProfile).returning();
    return profile;
  }

  async updateUserProfile(id: number, insertUserProfile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [profile] = await db.update(userProfiles).set(insertUserProfile).where(eq(userProfiles.id, id)).returning();
    return profile;
  }

  // Procedures
  async getProcedures(limit?: number, offset?: number, search?: string, categoryId?: number, companyId?: number): Promise<Procedure[]> {
    const whereConditions = [eq(procedures.isActive, true)];
    
    // CRITICAL: Always filter by company when provided
    if (companyId) {
      whereConditions.push(eq(procedures.companyId, companyId));
    }
    
    if (search) {
      whereConditions.push(ilike(procedures.name, `%${search}%`));
    }
    if (categoryId) {
      whereConditions.push(eq(procedures.categoryId, categoryId));
    }

    let query = db.select().from(procedures);

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!) as any;
    }

    if (limit) {
      query = query.limit(limit) as any;
    }
    if (offset) {
      query = query.offset(offset) as any;
    }

    return await query.orderBy(procedures.name);
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
  async getAppointments(date?: Date, dentistId?: number, startDate?: Date, endDate?: Date, companyId?: number): Promise<(Appointment & { patient: Patient; dentist: User; procedure: Procedure })[]> {
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

    // Add company filtering for data isolation
    if (companyId) {
      whereConditions.push(eq(appointments.companyId, companyId));
    }

    // Filter out cancelled appointments
    whereConditions.push(sql`${appointments.status} != 'cancelado'`);

    let query = db.select({
      id: appointments.id,
      companyId: appointments.companyId,
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

    const results = await query.orderBy(appointments.scheduledDate);
    
    // Ensure dates are returned as local time strings
    return results.map(appointment => ({
      ...appointment,
      scheduledDate: appointment.scheduledDate
    }));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment & { patient: Patient; dentist: User; procedure: Procedure }> {
    // Validate appointment conflicts with transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Check for conflicts before creating
      const conflictCheck = await this.checkAppointmentConflicts(insertAppointment, tx);
      if (conflictCheck.hasConflict) {
        throw new Error(conflictCheck.message);
      }
      
      // Create the appointment
      const [appointment] = await tx.insert(appointments).values(insertAppointment).returning();
      
      // Fetch the complete appointment with related data
      const completeAppointment = await tx.select({
        id: appointments.id,
        companyId: appointments.companyId,
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
      .innerJoin(procedures, eq(appointments.procedureId, procedures.id))
      .where(eq(appointments.id, appointment.id));
      
      return completeAppointment[0];
    });
    
    return result;
  }

  async updateAppointment(id: number, insertAppointment: Partial<InsertAppointment>): Promise<Appointment> {
    // Validate appointment conflicts for updates too
    const result = await db.transaction(async (tx) => {
      if (insertAppointment.scheduledDate || insertAppointment.dentistId || insertAppointment.procedureId) {
        const current = await this.getAppointment(id);
        if (current) {
          const updatedAppointment = {
            ...current,
            ...insertAppointment,
          };
          
          const conflictCheck = await this.checkAppointmentConflicts(updatedAppointment, tx, id);
          if (conflictCheck.hasConflict) {
            throw new Error(conflictCheck.message);
          }
        }
      }
      
      const [appointment] = await tx.update(appointments).set(insertAppointment).where(eq(appointments.id, id)).returning();
      return appointment;
    });
    
    return result;
  }

  // Enhanced conflict checking method with timezone handling
  async checkAppointmentConflicts(appointmentData: InsertAppointment, tx?: any, excludeId?: number): Promise<{ hasConflict: boolean; message: string }> {
    const dbConnection = tx || db;
    
    // Get procedure details to check duration
    const procedure = await dbConnection.select().from(procedures).where(eq(procedures.id, appointmentData.procedureId));
    if (!procedure.length) {
      return { hasConflict: false, message: '' };
    }
    
    const procedureDuration = procedure[0].duration; // in minutes
    
    // Parse the scheduled date as a local time string
    const scheduledDateStr = typeof appointmentData.scheduledDate === 'string' 
      ? appointmentData.scheduledDate 
      : appointmentData.scheduledDate.toISOString();
      
    // Create date from the string parts to avoid timezone conversion
    const dateParts = scheduledDateStr.replace('T', ' ').replace('Z', '').split(/[- :]/);
    const newStartTime = new Date(
      parseInt(dateParts[0]), // year
      parseInt(dateParts[1]) - 1, // month (0-indexed)
      parseInt(dateParts[2]), // day
      parseInt(dateParts[3] || 0), // hour
      parseInt(dateParts[4] || 0), // minute
      parseInt(dateParts[5] || 0) // second
    );
    
    const newEndTime = new Date(newStartTime.getTime() + (procedureDuration * 60 * 1000));
    
    // Build where conditions para buscar agendamentos do mesmo dentista que não estão cancelados
    let whereConditions = [
      eq(appointments.dentistId, appointmentData.dentistId),
      sql`${appointments.status} != 'cancelado'`
    ];
    
    // Add exclude condition only if excludeId is provided
    if (excludeId) {
      whereConditions.push(sql`${appointments.id} != ${excludeId}`);
    }
    
    // Check for conflicts with existing appointments
    const existingAppointments = await dbConnection.select({
      id: appointments.id,
      scheduledDate: appointments.scheduledDate,
      procedureId: appointments.procedureId,
      procedure: procedures,
    })
    .from(appointments)
    .innerJoin(procedures, eq(appointments.procedureId, procedures.id))
    .where(and(...whereConditions));
    
    // Check for time conflicts
    for (const existingAppt of existingAppointments) {
      // Parse existing appointment date as local time
      const existingDateStr = typeof existingAppt.scheduledDate === 'string'
        ? existingAppt.scheduledDate
        : existingAppt.scheduledDate.toISOString();
        
      // For database timestamps, they come as "YYYY-MM-DD HH:MM:SS" format
      let existingStartTime: Date;
      if (existingDateStr.includes(' ') && !existingDateStr.includes('T')) {
        // It's already in local format from database
        const [datePart, timePart] = existingDateStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = 0] = timePart.split(':').map(Number);
        existingStartTime = new Date(year, month - 1, day, hour, minute, second);
      } else {
        // Parse from ISO format
        const existingParts = existingDateStr.replace('T', ' ').replace('Z', '').split(/[- :]/);
        existingStartTime = new Date(
          parseInt(existingParts[0]), // year
          parseInt(existingParts[1]) - 1, // month (0-indexed)
          parseInt(existingParts[2]), // day
          parseInt(existingParts[3] || 0), // hour
          parseInt(existingParts[4] || 0), // minute
          parseInt(existingParts[5] || 0) // second
        );
      }
      
      const existingEndTime = new Date(existingStartTime.getTime() + (existingAppt.procedure.duration * 60 * 1000));
      
      // Check if time periods overlap (exclusive of exact boundaries)
      // If new appointment starts exactly when existing ends, it's not a conflict
      const hasOverlap = (newStartTime < existingEndTime && newEndTime > existingStartTime) && 
                        !(newStartTime.getTime() === existingEndTime.getTime() || newEndTime.getTime() === existingStartTime.getTime());
      
      if (hasOverlap) {
        // Log debug info
        console.log('Conflict detected:');
        console.log('New appointment:', newStartTime.toISOString(), 'to', newEndTime.toISOString());
        console.log('Existing appointment:', existingStartTime.toISOString(), 'to', existingEndTime.toISOString());
        console.log('Existing appointment ID:', existingAppt.id);
        
        // Format the time for display (already in local time)
        const formatLocalTime = (date: Date) => {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        };
        
        const conflictStart = formatLocalTime(existingStartTime);
        const conflictEnd = formatLocalTime(existingEndTime);
        
        return {
          hasConflict: true,
          message: `Conflito de horário detectado! Já existe um agendamento de ${conflictStart} até ${conflictEnd} (${existingAppt.procedure.name}).`
        };
      }
    }
    
    return { hasConflict: false, message: '' };
  }

  async cancelAllAppointments(): Promise<{ count: number }> {
    const result = await db.update(appointments)
      .set({ status: 'cancelado' })
      .where(sql`${appointments.status} != 'cancelado'`)
      .returning();
    return { count: result.length };
  }

  // Hard delete cancelled appointments to free up slots
  async cleanupCancelledAppointments(): Promise<{ count: number }> {
    const result = await db.delete(appointments)
      .where(eq(appointments.status, 'cancelado'))
      .returning();
    return { count: result.length };
  }

  // Check if appointment slot is available
  async isSlotAvailable(dentistId: number, scheduledDate: Date, procedureId: number, excludeId?: number): Promise<{ available: boolean; conflictMessage?: string }> {
    const conflictCheck = await this.checkAppointmentConflicts(
      { dentistId, scheduledDate, procedureId } as InsertAppointment,
      null,
      excludeId
    );
    
    return {
      available: !conflictCheck.hasConflict,
      conflictMessage: conflictCheck.message
    };
  }

  // Consultations
  async getConsultations(patientId?: number, dentistId?: number, status?: string, companyId?: number): Promise<(Consultation & { patient: Patient; dentist: User })[]> {
    let query = db.select({
      // Consultation fields
      id: consultations.id,
      attendanceNumber: consultations.attendanceNumber,
      patientId: consultations.patientId,
      dentistId: consultations.dentistId,
      appointmentId: consultations.appointmentId,
      date: consultations.date,
      procedures: consultations.procedures,
      clinicalNotes: consultations.clinicalNotes,
      observations: consultations.observations,
      status: consultations.status,
      createdAt: consultations.createdAt,
      updatedAt: consultations.updatedAt,
      // Patient info
      patient: {
        id: patients.id,
        name: patients.name,
        cpf: patients.cpf,
        phone: patients.phone,
        email: patients.email,
        birthDate: patients.birthDate,
        address: patients.address,
        isActive: patients.isActive,
        clinicalNotes: patients.clinicalNotes,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        cep: patients.cep,
        street: patients.street,
        number: patients.number,
        neighborhood: patients.neighborhood,
        city: patients.city,
        state: patients.state,
        companyId: patients.companyId,
      },
      // Dentist info
      dentist: {
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        forcePasswordChange: users.forcePasswordChange,
        dataScope: users.dataScope,
        createdAt: users.createdAt,
        password: users.password,
        companyId: users.companyId,
      }
    }).from(consultations)
      .innerJoin(patients, eq(consultations.patientId, patients.id))
      .innerJoin(users, eq(consultations.dentistId, users.id));
    
    // Apply filters
    const conditions = [];
    
    // CRITICAL: Add company filtering for data isolation
    if (companyId) {
      conditions.push(eq(patients.companyId, companyId));
      conditions.push(eq(users.companyId, companyId));
    }
    
    if (patientId) {
      conditions.push(eq(consultations.patientId, patientId));
    }
    if (dentistId) {
      conditions.push(eq(consultations.dentistId, dentistId));
    }
    if (status) {
      conditions.push(eq(consultations.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query.orderBy(desc(consultations.date));
    
    return result.map(row => ({
      id: row.id,
      attendanceNumber: row.attendanceNumber,
      patientId: row.patientId,
      dentistId: row.dentistId,
      appointmentId: row.appointmentId,
      date: row.date,
      procedures: row.procedures,
      clinicalNotes: row.clinicalNotes,
      observations: row.observations,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient,
      dentist: row.dentist
    }));
  }

  async getConsultation(id: number, companyId?: number): Promise<Consultation | undefined> {
    if (companyId) {
      // Verify company access by checking if patient and dentist belong to the company
      const result = await db.select({
        id: consultations.id,
        attendanceNumber: consultations.attendanceNumber,
        patientId: consultations.patientId,
        dentistId: consultations.dentistId,
        appointmentId: consultations.appointmentId,
        date: consultations.date,
        procedures: consultations.procedures,
        clinicalNotes: consultations.clinicalNotes,
        observations: consultations.observations,
        status: consultations.status,
        createdAt: consultations.createdAt,
        updatedAt: consultations.updatedAt,
      })
        .from(consultations)
        .innerJoin(patients, eq(consultations.patientId, patients.id))
        .innerJoin(users, eq(consultations.dentistId, users.id))
        .where(and(
          eq(consultations.id, id),
          eq(patients.companyId, companyId),
          eq(users.companyId, companyId)
        ));
      
      return result[0] || undefined;
    } else {
      const [consultation] = await db.select().from(consultations).where(eq(consultations.id, id));
      return consultation || undefined;
    }
  }

  async createConsultation(insertConsultation: InsertConsultation): Promise<Consultation> {
    // The trigger will automatically set the attendance number
    const consultationData = { ...insertConsultation };
    // Remove attendanceNumber if it exists to avoid conflicts
    delete (consultationData as any).attendanceNumber;
    
    // Ensure procedures is properly formatted as array
    let procedures = consultationData.procedures;
    if (typeof procedures === 'string') {
      procedures = [procedures];
    } else if (!Array.isArray(procedures)) {
      procedures = procedures ? [procedures] : [];
    }
    
    console.log('Creating consultation with procedures:', procedures);
    
    // Use raw SQL with proper array formatting for PostgreSQL
    const proceduresArray = procedures.length > 0 
      ? sql`ARRAY[${sql.join(procedures.map(p => sql`${p}`), sql`, `)}]`
      : sql`ARRAY[]::text[]`; // Explicitly cast empty array to text[]
      
    const result = await db.execute(sql`
      INSERT INTO consultations (
        patient_id, dentist_id, appointment_id, date, 
        procedures, clinical_notes, observations, status
      ) VALUES (
        ${consultationData.patientId}, 
        ${consultationData.dentistId}, 
        ${consultationData.appointmentId || null}, 
        ${consultationData.date}, 
        ${proceduresArray}, 
        ${consultationData.clinicalNotes || null}, 
        ${consultationData.observations || null}, 
        ${consultationData.status}
      ) RETURNING *
    `);
    
    return result.rows[0] as Consultation;
  }

  async updateConsultation(id: number, insertConsultation: Partial<InsertConsultation>): Promise<Consultation> {
    const updateData = { ...insertConsultation };
    // Remove attendanceNumber from update data as it should not be changed
    delete (updateData as any).attendanceNumber;
    const [consultation] = await db.update(consultations).set(updateData).where(eq(consultations.id, id)).returning();
    return consultation;
  }

  async deleteConsultation(id: number): Promise<void> {
    // First, delete related receivables
    await db.delete(receivables).where(eq(receivables.consultationId, id));
    
    // Then delete the consultation
    await db.delete(consultations).where(eq(consultations.id, id));
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

  // Receivables (Contas a Receber)
  async getReceivables(patientId?: number, status?: string, startDate?: Date, endDate?: Date, dentistId?: number, companyId?: number): Promise<(Receivable & { patient: Patient; consultation?: Consultation; appointment?: Appointment })[]> {
    const whereConditions = [];
    
    // CRITICAL: Always filter by company when provided
    if (companyId) {
      whereConditions.push(eq(receivables.companyId, companyId));
    }
    
    if (patientId) {
      whereConditions.push(eq(receivables.patientId, patientId));
    }
    if (status) {
      whereConditions.push(eq(receivables.status, status as any));
    }
    if (startDate) {
      whereConditions.push(sql`${receivables.dueDate} >= ${startDate}`);
    }
    if (endDate) {
      whereConditions.push(sql`${receivables.dueDate} <= ${endDate}`);
    }
    if (dentistId) {
      whereConditions.push(or(
        eq(consultations.dentistId, dentistId),
        eq(appointments.dentistId, dentistId)
      ));
    }

    let query = db
      .select({
        id: receivables.id,
        patientId: receivables.patientId,
        consultationId: receivables.consultationId,
        appointmentId: receivables.appointmentId,
        amount: receivables.amount,
        dueDate: receivables.dueDate,
        paymentDate: receivables.paymentDate,
        paymentMethod: receivables.paymentMethod,
        status: receivables.status,
        description: receivables.description,
        installments: receivables.installments,
        installmentNumber: receivables.installmentNumber,
        parentReceivableId: receivables.parentReceivableId,
        notes: receivables.notes,
        createdAt: receivables.createdAt,
        updatedAt: receivables.updatedAt,
        patient: {
          id: patients.id,
          name: patients.name,
          email: patients.email,
          phone: patients.phone,
        },
        consultation: {
          id: consultations.id,
          date: consultations.date,
        },
        appointment: {
          id: appointments.id,
          scheduledDate: appointments.scheduledDate,
        },
        consultationDentistId: consultations.dentistId,
        appointmentDentistId: appointments.dentistId,
      })
      .from(receivables)
      .innerJoin(patients, eq(receivables.patientId, patients.id))
      .leftJoin(consultations, eq(receivables.consultationId, consultations.id))
      .leftJoin(appointments, eq(receivables.appointmentId, appointments.id));

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!) as any;
    }

    return await query.orderBy(desc(receivables.dueDate));
  }

  async getReceivable(id: number, companyId?: number): Promise<Receivable | undefined> {
    const whereConditions = [eq(receivables.id, id)];
    
    // CRITICAL: Filter by company when provided
    if (companyId) {
      whereConditions.push(eq(receivables.companyId, companyId));
    }
    
    const [record] = await db.select().from(receivables).where(and(...whereConditions));
    return record || undefined;
  }

  async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> {
    const [record] = await db.insert(receivables).values(insertReceivable).returning();
    
    // Criar entrada no fluxo de caixa se for um recebimento
    if (insertReceivable.status === 'paid' && insertReceivable.paymentDate) {
      await this.createCashFlowEntry({
        type: 'income',
        receivableId: record.id,
        amount: insertReceivable.amount,
        date: insertReceivable.paymentDate,
        description: `Recebimento: ${insertReceivable.description || ''}`,
        category: 'receivable',
      });
    }
    
    return record;
  }

  async updateReceivable(id: number, insertReceivable: Partial<InsertReceivable>): Promise<Receivable> {
    const currentRecord = await this.getReceivable(id);
    const [record] = await db.update(receivables).set(insertReceivable).where(eq(receivables.id, id)).returning();
    
    // Se o status mudou para "pago", criar entrada no fluxo de caixa
    if (currentRecord?.status !== 'paid' && insertReceivable.status === 'paid' && insertReceivable.paymentDate) {
      await this.createCashFlowEntry({
        type: 'income',
        receivableId: record.id,
        amount: record.amount,
        date: insertReceivable.paymentDate,
        description: `Recebimento: ${record.description || ''}`,
        category: 'receivable',
      });
    }
    
    return record;
  }

  async deleteReceivable(id: number): Promise<void> {
    // Primeiro, remover todas as entradas relacionadas no fluxo de caixa
    await db.delete(cashFlow).where(eq(cashFlow.receivableId, id));
    
    // Depois, remover a conta a receber
    await db.delete(receivables).where(eq(receivables.id, id));
  }

  async createReceivableFromConsultation(consultationId: number, procedureIds: number[], installments: number = 1, customAmount?: string, paymentMethod: string = 'pix', dueDate?: string, companyId?: number): Promise<Receivable[]> {
    // Buscar consulta with company filtering
    const consultation = await this.getConsultation(consultationId, companyId);
    if (!consultation) {
      throw new Error('Consulta não encontrada');
    }

    // Usar valor personalizado ou calcular baseado nos procedimentos
    let totalAmount = 0;
    
    if (customAmount) {
      totalAmount = parseFloat(customAmount);
      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new Error('Valor personalizado inválido');
      }
    } else {
      // Buscar procedimentos e calcular total
      for (const procedureId of procedureIds) {
        const procedure = await this.getProcedure(procedureId);
        if (procedure) {
          totalAmount += parseFloat(procedure.price);
        }
      }

      if (totalAmount === 0) {
        throw new Error('Nenhum procedimento válido encontrado ou valor personalizado não informado');
      }
    }

    const receivablesList: Receivable[] = [];
    const installmentAmount = totalAmount / installments;

    for (let i = 1; i <= installments; i++) {
      // Usar data de vencimento fornecida ou calcular baseada na data atual
      let installmentDueDate: Date;
      if (dueDate) {
        // Forçar interpretação como data local para evitar conversão de timezone
        installmentDueDate = new Date(dueDate + 'T00:00:00');
        installmentDueDate.setMonth(installmentDueDate.getMonth() + (i - 1));
      } else {
        installmentDueDate = new Date();
        installmentDueDate.setMonth(installmentDueDate.getMonth() + (i - 1));
      }

      const receivableData: InsertReceivable = {
        companyId: companyId, // CRITICAL: Add company ID
        patientId: consultation.patientId,
        consultationId: consultationId,
        appointmentId: consultation.appointmentId || undefined,
        amount: installmentAmount.toFixed(2),
        dueDate: installmentDueDate.toISOString().split('T')[0],
        status: 'pending',
        description: `Consulta - Parcela ${i}/${installments}`,
        installments: installments,
        installmentNumber: i,
        parentReceivableId: i === 1 ? undefined : receivablesList[0]?.id,
        paymentMethod: paymentMethod,
      };

      const receivable = await this.createReceivable(receivableData);
      receivablesList.push(receivable);

      // Para parcelas subsequentes, definir o parentReceivableId
      if (i === 1 && installments > 1) {
        // Atualizar as próximas parcelas para referenciar a primeira
        for (let j = 1; j < receivablesList.length; j++) {
          await db.update(receivables)
            .set({ parentReceivableId: receivable.id })
            .where(eq(receivables.id, receivablesList[j].id));
        }
      }
    }

    return receivablesList;
  }

  // Payables (Contas a Pagar)
  async getPayables(status?: string, category?: string, startDate?: Date, endDate?: Date, companyId?: number): Promise<Payable[]> {
    const whereConditions = [];
    
    // CRITICAL: Always filter by company when provided
    if (companyId) {
      whereConditions.push(eq(payables.companyId, companyId));
    }
    
    if (status) {
      whereConditions.push(eq(payables.status, status as any));
    }
    if (category) {
      whereConditions.push(eq(payables.category, category as any));
    }
    if (startDate) {
      whereConditions.push(sql`${payables.dueDate} >= ${startDate}`);
    }
    if (endDate) {
      whereConditions.push(sql`${payables.dueDate} <= ${endDate}`);
    }

    let query = db.select().from(payables);

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!) as any;
    }

    return await query.orderBy(desc(payables.dueDate));
  }

  async getPayable(id: number, companyId?: number): Promise<Payable | undefined> {
    const whereConditions = [eq(payables.id, id)];
    
    // CRITICAL: Filter by company when provided
    if (companyId) {
      whereConditions.push(eq(payables.companyId, companyId));
    }
    
    const [record] = await db.select().from(payables).where(and(...whereConditions));
    return record || undefined;
  }

  async createPayable(insertPayable: InsertPayable): Promise<Payable> {
    const [record] = await db.insert(payables).values(insertPayable).returning();
    
    // Criar entrada no fluxo de caixa se for um pagamento
    if (insertPayable.status === 'paid' && insertPayable.paymentDate) {
      await this.createCashFlowEntry({
        type: 'expense',
        payableId: record.id,
        amount: `-${insertPayable.amount}`, // Negativo para saída
        date: insertPayable.paymentDate,
        description: `Pagamento: ${insertPayable.description}`,
        category: 'payable',
      });
    }
    
    return record;
  }

  async updatePayable(id: number, insertPayable: Partial<InsertPayable>): Promise<Payable> {
    const currentRecord = await this.getPayable(id);
    const [record] = await db.update(payables).set(insertPayable).where(eq(payables.id, id)).returning();
    
    // Se o status mudou para "pago", criar entrada no fluxo de caixa
    if (currentRecord?.status !== 'paid' && insertPayable.status === 'paid' && insertPayable.paymentDate) {
      await this.createCashFlowEntry({
        type: 'expense',
        payableId: record.id,
        amount: `-${record.amount}`, // Negativo para saída
        date: insertPayable.paymentDate,
        description: `Pagamento: ${record.description}`,
        category: 'payable',
      });
    }
    
    return record;
  }

  async deletePayable(id: number): Promise<void> {
    // Primeiro, remover todas as entradas relacionadas no fluxo de caixa
    await db.delete(cashFlow).where(eq(cashFlow.payableId, id));
    
    // Depois, remover a conta a pagar
    await db.delete(payables).where(eq(payables.id, id));
  }

  // Cash Flow (Fluxo de Caixa)
  async getCashFlow(startDate?: Date, endDate?: Date, companyId?: number): Promise<CashFlow[]> {
    const whereConditions = [];
    
    // CRITICAL: Always filter by company when provided
    if (companyId) {
      whereConditions.push(eq(cashFlow.companyId, companyId));
    }
    
    if (startDate) {
      whereConditions.push(sql`${cashFlow.date} >= ${startDate}`);
    }
    if (endDate) {
      whereConditions.push(sql`${cashFlow.date} <= ${endDate}`);
    }

    let query = db.select().from(cashFlow);

    if (whereConditions.length > 0) {
      query = query.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!) as any;
    }

    return await query.orderBy(desc(cashFlow.date), desc(cashFlow.createdAt));
  }

  async createCashFlowEntry(insertCashFlow: InsertCashFlow): Promise<CashFlow> {
    const [record] = await db.insert(cashFlow).values(insertCashFlow).returning();
    return record;
  }

  async getCurrentBalance(companyId?: number): Promise<number> {
    // Calcular saldo atual baseado na soma de todas as transações
    let query = db.select({ 
      total: sql<number>`coalesce(sum(${cashFlow.amount}), 0)` 
    }).from(cashFlow);

    // CRITICAL: Filter by company when provided
    if (companyId) {
      query = query.where(eq(cashFlow.companyId, companyId)) as any;
    }

    const [result] = await query;
    return result?.total || 0;
  }

  async getFinancialMetrics(startDate?: Date, endDate?: Date, companyId?: number): Promise<{
    totalReceivables: number;
    totalPayables: number;
    totalReceived: number;
    totalPaid: number;
    pendingReceivables: number;
    pendingPayables: number;
    currentBalance: number;
  }> {
    const whereReceivables = [];
    const wherePayables = [];
    
    // CRITICAL: Always filter by company when provided
    if (companyId) {
      whereReceivables.push(eq(receivables.companyId, companyId));
      wherePayables.push(eq(payables.companyId, companyId));
    }
    
    if (startDate) {
      whereReceivables.push(sql`${receivables.dueDate} >= ${startDate}`);
      wherePayables.push(sql`${payables.dueDate} >= ${startDate}`);
    }
    if (endDate) {
      whereReceivables.push(sql`${receivables.dueDate} <= ${endDate}`);
      wherePayables.push(sql`${payables.dueDate} <= ${endDate}`);
    }

    // Total a receber
    let totalReceivablesQuery = db
      .select({ sum: sql<number>`coalesce(sum(${receivables.amount}), 0)` })
      .from(receivables);
    if (whereReceivables.length > 0) {
      totalReceivablesQuery = totalReceivablesQuery.where(and(...whereReceivables)) as any;
    }

    // Total a pagar
    let totalPayablesQuery = db
      .select({ sum: sql<number>`coalesce(sum(${payables.amount}), 0)` })
      .from(payables);
    if (wherePayables.length > 0) {
      totalPayablesQuery = totalPayablesQuery.where(and(...wherePayables)) as any;
    }

    // Executar queries
    const [totalReceivablesResult] = await totalReceivablesQuery;
    const [totalPayablesResult] = await totalPayablesQuery;

    // Build conditions for paid/pending status queries
    const paidReceivableConditions = [eq(receivables.status, 'paid')];
    const paidPayableConditions = [eq(payables.status, 'paid')];
    const pendingReceivableConditions = [eq(receivables.status, 'pending')];
    const pendingPayableConditions = [eq(payables.status, 'pending')];

    if (companyId) {
      paidReceivableConditions.push(eq(receivables.companyId, companyId));
      paidPayableConditions.push(eq(payables.companyId, companyId));
      pendingReceivableConditions.push(eq(receivables.companyId, companyId));
      pendingPayableConditions.push(eq(payables.companyId, companyId));
    }

    const [totalReceivedResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${receivables.amount}), 0)` })
      .from(receivables)
      .where(and(...paidReceivableConditions));

    const [totalPaidResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${payables.amount}), 0)` })
      .from(payables)
      .where(and(...paidPayableConditions));

    const [pendingReceivablesResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${receivables.amount}), 0)` })
      .from(receivables)
      .where(and(...pendingReceivableConditions));

    const [pendingPayablesResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${payables.amount}), 0)` })
      .from(payables)
      .where(and(...pendingPayableConditions));

    const currentBalance = await this.getCurrentBalance(companyId);

    return {
      totalReceivables: totalReceivablesResult.sum,
      totalPayables: totalPayablesResult.sum,
      totalReceived: totalReceivedResult.sum,
      totalPaid: totalPaidResult.sum,
      pendingReceivables: pendingReceivablesResult.sum,
      pendingPayables: pendingPayablesResult.sum,
      currentBalance,
    };
  }

  // Dashboard metrics
  async getDashboardMetrics(companyId?: number): Promise<{
    todayAppointments: number;
    activePatients: number;
    monthlyRevenue: number;
    pendingPayments: number;
  }> {
    try {
      // Build conditions with company filtering
      let appointmentConditions = [
        sql`DATE(${appointments.scheduledDate}) = CURRENT_DATE`,
        ne(appointments.status, 'cancelado')
      ];
      let patientConditions = [eq(patients.isActive, true)];
      let receivableConditions = [];
      
      if (companyId) {
        appointmentConditions.push(eq(appointments.companyId, companyId));
        patientConditions.push(eq(patients.companyId, companyId));
        receivableConditions.push(eq(receivables.companyId, companyId));
      }

      // Count today's appointments (all status except cancelled)
      const [todayAppointmentsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(and(...appointmentConditions));

      // Count active patients
      const [activePatientsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(and(...patientConditions));

      // Calculate monthly revenue from paid receivables
      const monthlyRevenueConditions = [
        ...receivableConditions,
        eq(receivables.status, "paid"),
        sql`EXTRACT(MONTH FROM ${receivables.paymentDate}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
        sql`EXTRACT(YEAR FROM ${receivables.paymentDate}) = EXTRACT(YEAR FROM CURRENT_DATE)`
      ];
      const [monthlyRevenueResult] = await db
        .select({ sum: sql<number>`coalesce(sum(${receivables.amount}::decimal), 0)` })
        .from(receivables)
        .where(and(...monthlyRevenueConditions));

      // Calculate pending payments from receivables
      const pendingConditions = [...receivableConditions, eq(receivables.status, "pending")];
      const [pendingPaymentsResult] = await db
        .select({ sum: sql<number>`coalesce(sum(${receivables.amount}::decimal), 0)` })
        .from(receivables)
        .where(and(...pendingConditions));

      return {
        todayAppointments: Number(todayAppointmentsResult.count) || 0,
        activePatients: Number(activePatientsResult.count) || 0,
        monthlyRevenue: Number(monthlyRevenueResult.sum) || 0,
        pendingPayments: Number(pendingPaymentsResult.sum) || 0,
      };
    } catch (error) {
      console.error("Error in getDashboardMetrics:", error);
      // Return zeros if there's an error
      return {
        todayAppointments: 0,
        activePatients: 0,
        monthlyRevenue: 0,
        pendingPayments: 0,
      };
    }
  }

  // Reports methods
  async getOverviewReport(user: any, startDate?: Date, endDate?: Date) {
    const whereAppointments = [];
    const whereConsultations = [];
    const whereReceivables = [];
    const wherePayables = [];
    
    // Date filters
    if (startDate) {
      whereAppointments.push(sql`${appointments.scheduledDate} >= ${startDate}`);
      whereConsultations.push(sql`${consultations.date} >= ${startDate}`);
      whereReceivables.push(sql`${receivables.dueDate} >= ${startDate}`);
      wherePayables.push(sql`${payables.dueDate} >= ${startDate}`);
    }
    if (endDate) {
      whereAppointments.push(sql`${appointments.scheduledDate} <= ${endDate}`);
      whereConsultations.push(sql`${consultations.date} <= ${endDate}`);
      whereReceivables.push(sql`${receivables.dueDate} <= ${endDate}`);
      wherePayables.push(sql`${payables.dueDate} <= ${endDate}`);
    }

    // Data scope filters
    if (user.role !== "admin" && user.dataScope === "own") {
      whereAppointments.push(eq(appointments.dentistId, user.id));
      whereConsultations.push(eq(consultations.dentistId, user.id));
    }

    // Get appointments
    let appointmentsQuery = db.select().from(appointments);
    if (whereAppointments.length > 0) {
      appointmentsQuery = appointmentsQuery.where(and(...whereAppointments)) as any;
    }
    const appointmentsList = await appointmentsQuery;

    // Get consultations
    let consultationsQuery = db.select().from(consultations);
    if (whereConsultations.length > 0) {
      consultationsQuery = consultationsQuery.where(and(...whereConsultations)) as any;
    }
    const consultationsList = await consultationsQuery;

    // Get receivables
    let receivablesQuery = db.select().from(receivables);
    if (whereReceivables.length > 0) {
      receivablesQuery = receivablesQuery.where(and(...whereReceivables)) as any;
    }
    if (user.role !== "admin" && user.dataScope === "own") {
      receivablesQuery = receivablesQuery
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
        ) as any;
    }
    const receivablesList = await receivablesQuery;

    // Get payables (only for admin and "all" scope users)
    let payablesList = [];
    if (user.role === "admin" || user.dataScope === "all") {
      let payablesQuery = db.select().from(payables);
      if (wherePayables.length > 0) {
        payablesQuery = payablesQuery.where(and(...wherePayables)) as any;
      }
      payablesList = await payablesQuery;
    }

    // Get patients
    const patientsList = await db.select().from(patients);

    // Calculate statistics
    const stats = {
      totalAppointments: appointmentsList.length,
      scheduledAppointments: appointmentsList.filter(apt => apt.status === "agendado").length,
      inProgressAppointments: appointmentsList.filter(apt => apt.status === "em_atendimento").length,
      completedAppointments: appointmentsList.filter(apt => apt.status === "concluido").length,
      cancelledAppointments: appointmentsList.filter(apt => apt.status === "cancelado").length,
      totalConsultations: consultationsList.length,
      totalRevenue: receivablesList
        .filter(rec => rec.status === "paid")
        .reduce((sum, rec) => sum + parseFloat(rec.amount), 0),
      pendingRevenue: receivablesList
        .filter(rec => rec.status === "pending")
        .reduce((sum, rec) => sum + parseFloat(rec.amount), 0),
      totalExpenses: payablesList
        .filter(pay => pay.status === "paid")
        .reduce((sum, pay) => sum + parseFloat(pay.amount), 0),
      pendingExpenses: payablesList
        .filter(pay => pay.status === "pending")
        .reduce((sum, pay) => sum + parseFloat(pay.amount), 0),
      totalPatients: patientsList.filter(p => p.isActive).length,
      newPatients: patientsList.filter(p => {
        if (!p.isActive) return false;
        const createdDate = new Date(p.createdAt);
        return (!startDate || createdDate >= startDate) && (!endDate || createdDate <= endDate);
      }).length,
    };

    return {
      period: {
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0]
      },
      statistics: stats,
      appointmentsByStatus: {
        agendado: stats.scheduledAppointments,
        em_atendimento: stats.inProgressAppointments,
        concluido: stats.completedAppointments,
        cancelado: stats.cancelledAppointments
      }
    };
  }

  async getFinancialReport(user: any, startDate?: Date, endDate?: Date) {
    const whereReceivables = [];
    const wherePayables = [];
    
    if (startDate) {
      whereReceivables.push(sql`${receivables.dueDate} >= ${startDate}`);
      wherePayables.push(sql`${payables.dueDate} >= ${startDate}`);
    }
    if (endDate) {
      whereReceivables.push(sql`${receivables.dueDate} <= ${endDate}`);
      wherePayables.push(sql`${payables.dueDate} <= ${endDate}`);
    }

    // Get receivables
    let receivablesQuery = db.select().from(receivables);
    if (whereReceivables.length > 0) {
      receivablesQuery = receivablesQuery.where(and(...whereReceivables)) as any;
    }
    if (user.role !== "admin" && user.dataScope === "own") {
      receivablesQuery = receivablesQuery
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
        ) as any;
    }
    const receivablesList = await receivablesQuery;

    // Get payables (only for admin and "all" scope users)
    let payablesList = [];
    if (user.role === "admin" || user.dataScope === "all") {
      let payablesQuery = db.select().from(payables);
      if (wherePayables.length > 0) {
        payablesQuery = payablesQuery.where(and(...wherePayables)) as any;
      }
      payablesList = await payablesQuery;
    }

    // Calculate monthly revenue
    const monthlyRevenue = receivablesList.reduce((acc, rec) => {
      const month = new Date(rec.dueDate).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = { received: 0, pending: 0 };
      if (rec.status === "paid") {
        acc[month].received += parseFloat(rec.amount);
      } else {
        acc[month].pending += parseFloat(rec.amount);
      }
      return acc;
    }, {} as Record<string, { received: number, pending: number }>);

    // Calculate monthly expenses
    const monthlyExpenses = payablesList.reduce((acc, pay) => {
      const month = new Date(pay.dueDate).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = { paid: 0, pending: 0 };
      if (pay.status === "paid") {
        acc[month].paid += parseFloat(pay.amount);
      } else {
        acc[month].pending += parseFloat(pay.amount);
      }
      return acc;
    }, {} as Record<string, { paid: number, pending: number }>);

    // Financial statistics
    const stats = {
      totalRevenue: receivablesList
        .filter(rec => rec.status === "paid")
        .reduce((sum, rec) => sum + parseFloat(rec.amount), 0),
      pendingRevenue: receivablesList
        .filter(rec => rec.status === "pending")
        .reduce((sum, rec) => sum + parseFloat(rec.amount), 0),
      totalExpenses: payablesList
        .filter(pay => pay.status === "paid")
        .reduce((sum, pay) => sum + parseFloat(pay.amount), 0),
      pendingExpenses: payablesList
        .filter(pay => pay.status === "pending")
        .reduce((sum, pay) => sum + parseFloat(pay.amount), 0),
      netIncome: 0, // Will be calculated below
      profitMargin: 0 // Will be calculated below
    };

    stats.netIncome = stats.totalRevenue - stats.totalExpenses;
    stats.profitMargin = stats.totalRevenue > 0 ? (stats.netIncome / stats.totalRevenue) * 100 : 0;

    return {
      period: {
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0]
      },
      statistics: stats,
      monthlyRevenue,
      monthlyExpenses,
      receivablesByStatus: {
        paid: receivablesList.filter(rec => rec.status === "paid").length,
        pending: receivablesList.filter(rec => rec.status === "pending").length,
        overdue: receivablesList.filter(rec => rec.status === "pending" && new Date(rec.dueDate) < new Date()).length
      },
      payablesByStatus: {
        paid: payablesList.filter(pay => pay.status === "paid").length,
        pending: payablesList.filter(pay => pay.status === "pending").length,
        overdue: payablesList.filter(pay => pay.status === "pending" && new Date(pay.dueDate) < new Date()).length
      }
    };
  }

  async getAppointmentsReport(user: any, startDate?: Date, endDate?: Date) {
    const whereAppointments = [];
    const whereConsultations = [];
    
    if (startDate) {
      whereAppointments.push(sql`${appointments.scheduledDate} >= ${startDate}`);
      whereConsultations.push(sql`${consultations.date} >= ${startDate}`);
    }
    if (endDate) {
      whereAppointments.push(sql`${appointments.scheduledDate} <= ${endDate}`);
      whereConsultations.push(sql`${consultations.date} <= ${endDate}`);
    }

    // Data scope filters
    if (user.role !== "admin" && user.dataScope === "own") {
      whereAppointments.push(eq(appointments.dentistId, user.id));
      whereConsultations.push(eq(consultations.dentistId, user.id));
    }

    // Get appointments with patient and dentist info
    let appointmentsQuery = db.select({
      id: appointments.id,
      scheduledDate: appointments.scheduledDate,
      scheduledTime: appointments.scheduledTime,
      status: appointments.status,
      patientName: patients.name,
      dentistName: users.name,
      procedures: appointments.procedures
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.dentistId, users.id));

    if (whereAppointments.length > 0) {
      appointmentsQuery = appointmentsQuery.where(and(...whereAppointments)) as any;
    }
    const appointmentsList = await appointmentsQuery;

    // Get consultations
    let consultationsQuery = db.select().from(consultations);
    if (whereConsultations.length > 0) {
      consultationsQuery = consultationsQuery.where(and(...whereConsultations)) as any;
    }
    const consultationsList = await consultationsQuery;

    // Calculate daily statistics
    const dailyStats = appointmentsList.reduce((acc, apt) => {
      const date = apt.scheduledDate;
      if (!acc[date]) {
        acc[date] = {
          total: 0,
          agendado: 0,
          em_atendimento: 0,
          concluido: 0,
          cancelado: 0
        };
      }
      acc[date].total++;
      acc[date][apt.status]++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate dentist statistics
    const dentistStats = appointmentsList.reduce((acc, apt) => {
      const dentist = apt.dentistName || "Não informado";
      if (!acc[dentist]) {
        acc[dentist] = {
          total: 0,
          agendado: 0,
          em_atendimento: 0,
          concluido: 0,
          cancelado: 0
        };
      }
      acc[dentist].total++;
      acc[dentist][apt.status]++;
      return acc;
    }, {} as Record<string, any>);

    const stats = {
      totalAppointments: appointmentsList.length,
      scheduledAppointments: appointmentsList.filter(apt => apt.status === "agendado").length,
      inProgressAppointments: appointmentsList.filter(apt => apt.status === "em_atendimento").length,
      completedAppointments: appointmentsList.filter(apt => apt.status === "concluido").length,
      cancelledAppointments: appointmentsList.filter(apt => apt.status === "cancelado").length,
      totalConsultations: consultationsList.length,
      attendanceRate: appointmentsList.length > 0 ? 
        (appointmentsList.filter(apt => apt.status === "concluido").length / appointmentsList.length) * 100 : 0,
      cancellationRate: appointmentsList.length > 0 ? 
        (appointmentsList.filter(apt => apt.status === "cancelado").length / appointmentsList.length) * 100 : 0
    };

    return {
      period: {
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0]
      },
      statistics: stats,
      dailyStats,
      dentistStats,
      appointmentsByStatus: {
        agendado: stats.scheduledAppointments,
        em_atendimento: stats.inProgressAppointments,
        concluido: stats.completedAppointments,
        cancelado: stats.cancelledAppointments
      }
    };
  }

  async getProceduresReport(user: any, startDate?: Date, endDate?: Date) {
    const whereConsultations = [];
    
    if (startDate) {
      whereConsultations.push(sql`${consultations.date} >= ${startDate}`);
    }
    if (endDate) {
      whereConsultations.push(sql`${consultations.date} <= ${endDate}`);
    }

    // Data scope filters
    if (user.role !== "admin" && user.dataScope === "own") {
      whereConsultations.push(eq(consultations.dentistId, user.id));
    }

    // Get consultations with procedures
    let consultationsQuery = db.select({
      id: consultations.id,
      date: consultations.date,
      procedures: consultations.procedures,
      patientName: patients.name,
      dentistName: users.name
    })
    .from(consultations)
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(users, eq(consultations.dentistId, users.id));

    if (whereConsultations.length > 0) {
      consultationsQuery = consultationsQuery.where(and(...whereConsultations)) as any;
    }
    const consultationsList = await consultationsQuery;

    // Count procedures
    const procedureCount = consultationsList.reduce((acc, cons) => {
      if (cons.procedures && Array.isArray(cons.procedures)) {
        cons.procedures.forEach(proc => {
          if (typeof proc === 'string') {
            acc[proc] = (acc[proc] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    // Get top procedures
    const topProcedures = Object.entries(procedureCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // Calculate monthly procedure statistics
    const monthlyProcedures = consultationsList.reduce((acc, cons) => {
      const month = new Date(cons.date).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = 0;
      if (cons.procedures && Array.isArray(cons.procedures)) {
        acc[month] += cons.procedures.length;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calculate dentist procedure statistics
    const dentistProcedures = consultationsList.reduce((acc, cons) => {
      const dentist = cons.dentistName || "Não informado";
      if (!acc[dentist]) acc[dentist] = 0;
      if (cons.procedures && Array.isArray(cons.procedures)) {
        acc[dentist] += cons.procedures.length;
      }
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      totalConsultations: consultationsList.length,
      totalProcedures: Object.values(procedureCount).reduce((sum, count) => sum + count, 0),
      uniqueProcedures: Object.keys(procedureCount).length,
      averageProceduresPerConsultation: consultationsList.length > 0 ? 
        Object.values(procedureCount).reduce((sum, count) => sum + count, 0) / consultationsList.length : 0
    };

    return {
      period: {
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0]
      },
      statistics: stats,
      topProcedures,
      monthlyProcedures,
      dentistProcedures,
      procedureCount
    };
  }
}

export const storage = new DatabaseStorage();
