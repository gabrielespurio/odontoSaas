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
  userProfiles,
  receivables,
  payables,
  cashFlow,
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
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  
  // Consultations
  getConsultations(patientId?: number, dentistId?: number): Promise<(Consultation & { patient: Patient; dentist: User })[]>;
  getConsultation(id: number): Promise<Consultation | undefined>;
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
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  // User Profiles
  async getUserProfiles(): Promise<UserProfile[]> {
    return await db.select().from(userProfiles).where(eq(userProfiles.isActive, true)).orderBy(userProfiles.name);
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

    // Filter out cancelled appointments
    whereConditions.push(sql`${appointments.status} != 'cancelado'`);

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

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment & { patient: Patient; dentist: User; procedure: Procedure }> {
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    
    // Fetch the complete appointment with related data
    const completeAppointment = await db.select({
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
    .innerJoin(procedures, eq(appointments.procedureId, procedures.id))
    .where(eq(appointments.id, appointment.id));
    
    return completeAppointment[0];
  }

  async updateAppointment(id: number, insertAppointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [appointment] = await db.update(appointments).set(insertAppointment).where(eq(appointments.id, id)).returning();
    return appointment;
  }

  // Consultations
  async getConsultations(patientId?: number, dentistId?: number): Promise<(Consultation & { patient: Patient; dentist: User })[]> {
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
      }
    }).from(consultations)
      .innerJoin(patients, eq(consultations.patientId, patients.id))
      .innerJoin(users, eq(consultations.dentistId, users.id));
    
    // Apply filters
    const conditions = [];
    if (patientId) {
      conditions.push(eq(consultations.patientId, patientId));
    }
    if (dentistId) {
      conditions.push(eq(consultations.dentistId, dentistId));
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

  async getConsultation(id: number): Promise<Consultation | undefined> {
    const [consultation] = await db.select().from(consultations).where(eq(consultations.id, id));
    return consultation || undefined;
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
    const result = await db.execute(sql`
      INSERT INTO consultations (
        patient_id, dentist_id, appointment_id, date, 
        procedures, clinical_notes, observations, status
      ) VALUES (
        ${consultationData.patientId}, 
        ${consultationData.dentistId}, 
        ${consultationData.appointmentId || null}, 
        ${consultationData.date}, 
        ${sql`ARRAY[${sql.join(procedures.map(p => sql`${p}`), sql`, `)}]`}, 
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
  async getReceivables(patientId?: number, status?: string, startDate?: Date, endDate?: Date, dentistId?: number): Promise<(Receivable & { patient: Patient; consultation?: Consultation; appointment?: Appointment })[]> {
    const whereConditions = [];
    
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

  async getReceivable(id: number): Promise<Receivable | undefined> {
    const [record] = await db.select().from(receivables).where(eq(receivables.id, id));
    return record || undefined;
  }

  async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> {
    const [record] = await db.insert(receivables).values(insertReceivable).returning();
    
    // Criar entrada no fluxo de caixa se for um recebimento
    if (insertReceivable.status === 'paid' && insertReceivable.paymentDate) {
      await this.createCashFlowEntry({
        type: 'receivable',
        referenceId: record.id,
        amount: insertReceivable.amount,
        date: insertReceivable.paymentDate,
        description: `Recebimento: ${insertReceivable.description || ''}`,
        balance: '0', // Será calculado dinamicamente
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
        type: 'receivable',
        referenceId: record.id,
        amount: record.amount,
        date: insertReceivable.paymentDate,
        description: `Recebimento: ${record.description || ''}`,
        balance: '0', // Será calculado dinamicamente
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

  async createReceivableFromConsultation(consultationId: number, procedureIds: number[], installments: number = 1, customAmount?: string): Promise<Receivable[]> {
    // Buscar consulta
    const consultation = await this.getConsultation(consultationId);
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
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const receivableData: InsertReceivable = {
        patientId: consultation.patientId,
        consultationId: consultationId,
        appointmentId: consultation.appointmentId || undefined,
        amount: installmentAmount.toFixed(2),
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending',
        description: `Consulta - Parcela ${i}/${installments}`,
        installments: installments,
        installmentNumber: i,
        parentReceivableId: i === 1 ? undefined : receivablesList[0]?.id,
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
  async getPayables(status?: string, category?: string, startDate?: Date, endDate?: Date): Promise<Payable[]> {
    const whereConditions = [];
    
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

  async getPayable(id: number): Promise<Payable | undefined> {
    const [record] = await db.select().from(payables).where(eq(payables.id, id));
    return record || undefined;
  }

  async createPayable(insertPayable: InsertPayable): Promise<Payable> {
    const [record] = await db.insert(payables).values(insertPayable).returning();
    
    // Criar entrada no fluxo de caixa se for um pagamento
    if (insertPayable.status === 'paid' && insertPayable.paymentDate) {
      await this.createCashFlowEntry({
        type: 'payable',
        referenceId: record.id,
        amount: `-${insertPayable.amount}`, // Negativo para saída
        date: insertPayable.paymentDate,
        description: `Pagamento: ${insertPayable.description}`,
        balance: '0', // Será calculado dinamicamente
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
        type: 'payable',
        referenceId: record.id,
        amount: `-${record.amount}`, // Negativo para saída
        date: insertPayable.paymentDate,
        description: `Pagamento: ${record.description}`,
        balance: '0', // Será calculado dinamicamente
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
  async getCashFlow(startDate?: Date, endDate?: Date): Promise<CashFlow[]> {
    const whereConditions = [];
    
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
    // Calcular o saldo atual
    const currentBalance = await this.getCurrentBalance();
    const newBalance = currentBalance + parseFloat(insertCashFlow.amount);

    const [record] = await db.insert(cashFlow).values({
      ...insertCashFlow,
      balance: newBalance.toFixed(2),
    }).returning();
    
    return record;
  }

  async getCurrentBalance(): Promise<number> {
    const [result] = await db
      .select({ balance: sql<number>`coalesce(${cashFlow.balance}, 0)` })
      .from(cashFlow)
      .orderBy(desc(cashFlow.createdAt))
      .limit(1);

    return result?.balance || 0;
  }

  async getFinancialMetrics(startDate?: Date, endDate?: Date): Promise<{
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

    const [totalReceivedResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${receivables.amount}), 0)` })
      .from(receivables)
      .where(eq(receivables.status, 'paid'));

    const [totalPaidResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${payables.amount}), 0)` })
      .from(payables)
      .where(eq(payables.status, 'paid'));

    const [pendingReceivablesResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${receivables.amount}), 0)` })
      .from(receivables)
      .where(eq(receivables.status, 'pending'));

    const [pendingPayablesResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${payables.amount}), 0)` })
      .from(payables)
      .where(eq(payables.status, 'pending'));

    const currentBalance = await this.getCurrentBalance();

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
