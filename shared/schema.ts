import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  decimal,
  date,
  jsonb,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "dentist", "reception"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["agendado", "em_atendimento", "concluido", "cancelado"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "cancelled"]);
export const accountTypeEnum = pgEnum("account_type", ["receivable", "payable"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "credit_card", "debit_card", "pix", "bank_transfer", "check"]);
export const expenseCategoryEnum = pgEnum("expense_category", ["rent", "salaries", "materials", "equipment", "utilities", "marketing", "other"]);
export const toothConditionEnum = pgEnum("tooth_condition", ["healthy", "carie", "restoration", "extraction", "planned_treatment", "completed_treatment"]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("dentist"), // Changed to text to support custom profiles
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patients table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  birthDate: date("birth_date").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  // Address fields
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  address: text("address"), // Keep for backwards compatibility
  isActive: boolean("is_active").notNull().default(true),
  clinicalNotes: text("clinical_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Procedure Categories table
export const procedureCategories = pgTable("procedure_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Profiles table
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  modules: jsonb("modules").notNull().default('[]'), // Array of module names
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Procedures table
export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  dentistId: integer("dentist_id").notNull(),
  procedureId: integer("procedure_id").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: appointmentStatusEnum("status").notNull().default("agendado"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consultations table
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  dentistId: integer("dentist_id").notNull(),
  appointmentId: integer("appointment_id"),
  date: timestamp("date").notNull(),
  procedures: text("procedures").array(),
  clinicalNotes: text("clinical_notes"),
  observations: text("observations"),
  status: appointmentStatusEnum("status").notNull().default("agendado"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dental Chart table
export const dentalChart = pgTable("dental_chart", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  toothNumber: text("tooth_number").notNull(), // FDI numbering
  condition: toothConditionEnum("condition").notNull().default("healthy"),
  notes: text("notes"),
  treatmentDate: date("treatment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Anamnese table
export const anamnese = pgTable("anamnese", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  medicalTreatment: boolean("medical_treatment").notNull().default(false),
  medications: text("medications"),
  allergies: text("allergies"),
  previousDentalTreatment: boolean("previous_dental_treatment").notNull().default(false),
  painComplaint: text("pain_complaint"),
  additionalQuestions: jsonb("additional_questions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contas a Receber (Receivables)
export const receivables = pgTable("receivables", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  consultationId: integer("consultation_id"),
  appointmentId: integer("appointment_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  paymentDate: date("payment_date"),
  paymentMethod: paymentMethodEnum("payment_method"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  description: text("description"),
  installments: integer("installments").default(1),
  installmentNumber: integer("installment_number").default(1),
  parentReceivableId: integer("parent_receivable_id"), // Para parcelas
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contas a Pagar (Payables)
export const payables = pgTable("payables", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  paymentDate: date("payment_date"),
  paymentMethod: paymentMethodEnum("payment_method"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  supplier: text("supplier"), // Fornecedor opcional
  notes: text("notes"),
  attachmentPath: text("attachment_path"), // Caminho do comprovante
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Movimentação de Caixa (Cash Flow)
export const cashFlow = pgTable("cash_flow", {
  id: serial("id").primaryKey(),
  type: accountTypeEnum("type").notNull(), // receivable ou payable
  referenceId: integer("reference_id").notNull(), // ID da conta a receber/pagar
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(), // Saldo após movimentação
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Manter tabela financial para compatibilidade (deprecated)
export const financial = pgTable("financial", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  consultationId: integer("consultation_id"),
  appointmentId: integer("appointment_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  paymentDate: date("payment_date"),
  paymentMethod: text("payment_method"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  appointments: many(appointments),
  consultations: many(consultations),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  appointments: many(appointments),
  consultations: many(consultations),
  dentalChart: many(dentalChart),
  anamnese: many(anamnese),
  financial: many(financial),
  receivables: many(receivables),
}));

export const procedureCategoriesRelations = relations(procedureCategories, ({ many }) => ({
  procedures: many(procedures),
}));

export const proceduresRelations = relations(procedures, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  dentist: one(users, {
    fields: [appointments.dentistId],
    references: [users.id],
  }),
  procedure: one(procedures, {
    fields: [appointments.procedureId],
    references: [procedures.id],
  }),
  consultations: many(consultations),
  financial: many(financial),
  receivables: many(receivables),
}));

export const consultationsRelations = relations(consultations, ({ one, many }) => ({
  patient: one(patients, {
    fields: [consultations.patientId],
    references: [patients.id],
  }),
  dentist: one(users, {
    fields: [consultations.dentistId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [consultations.appointmentId],
    references: [appointments.id],
  }),
  receivables: many(receivables),
}));

export const dentalChartRelations = relations(dentalChart, ({ one }) => ({
  patient: one(patients, {
    fields: [dentalChart.patientId],
    references: [patients.id],
  }),
}));

export const anamneseRelations = relations(anamnese, ({ one }) => ({
  patient: one(patients, {
    fields: [anamnese.patientId],
    references: [patients.id],
  }),
}));

export const financialRelations = relations(financial, ({ one }) => ({
  patient: one(patients, {
    fields: [financial.patientId],
    references: [patients.id],
  }),
  consultation: one(consultations, {
    fields: [financial.consultationId],
    references: [consultations.id],
  }),
  appointment: one(appointments, {
    fields: [financial.appointmentId],
    references: [appointments.id],
  }),
}));

// Relações para as novas tabelas
export const receivablesRelations = relations(receivables, ({ one, many }) => ({
  patient: one(patients, {
    fields: [receivables.patientId],
    references: [patients.id],
  }),
  consultation: one(consultations, {
    fields: [receivables.consultationId],
    references: [consultations.id],
  }),
  appointment: one(appointments, {
    fields: [receivables.appointmentId],
    references: [appointments.id],
  }),
  parentReceivable: one(receivables, {
    fields: [receivables.parentReceivableId],
    references: [receivables.id],
  }),
  installments: many(receivables),
  cashFlowEntries: many(cashFlow),
}));

export const payablesRelations = relations(payables, ({ many }) => ({
  cashFlowEntries: many(cashFlow),
}));

export const cashFlowRelations = relations(cashFlow, ({ one }) => ({
  receivableReference: one(receivables, {
    fields: [cashFlow.referenceId],
    references: [receivables.id],
  }),
  payableReference: one(payables, {
    fields: [cashFlow.referenceId],
    references: [payables.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcedureSchema = createInsertSchema(procedures).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.string().transform((str) => new Date(str)),
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.string().transform((str) => new Date(str)),
});

export const insertDentalChartSchema = createInsertSchema(dentalChart).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define additionalQuestions structure
export const additionalQuestionsSchema = z.object({
  hasHeartProblems: z.boolean().optional(),
  hasDiabetes: z.boolean().optional(),
  hasHypertension: z.boolean().optional(),
  isPregnant: z.boolean().optional(),
  smokingHabits: z.string().optional(),
  bleedingProblems: z.boolean().optional(),
  familyHistory: z.string().optional(),
}).optional();

export const insertAnamneseSchema = createInsertSchema(anamnese).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  additionalQuestions: additionalQuestionsSchema,
});

export const insertFinancialSchema = createInsertSchema(financial).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcedureCategorySchema = createInsertSchema(procedureCategories).omit({
  id: true,
  createdAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertReceivableSchema = createInsertSchema(receivables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayableSchema = createInsertSchema(payables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCashFlowSchema = createInsertSchema(cashFlow).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type DentalChart = typeof dentalChart.$inferSelect;
export type InsertDentalChart = z.infer<typeof insertDentalChartSchema>;
export type Anamnese = typeof anamnese.$inferSelect;
export type InsertAnamnese = z.infer<typeof insertAnamneseSchema>;
export type Financial = typeof financial.$inferSelect;
export type InsertFinancial = z.infer<typeof insertFinancialSchema>;
export type ProcedureCategory = typeof procedureCategories.$inferSelect;
export type InsertProcedureCategory = z.infer<typeof insertProcedureCategorySchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

// Novos tipos para o módulo financeiro
export type Receivable = typeof receivables.$inferSelect;
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Payable = typeof payables.$inferSelect;
export type InsertPayable = z.infer<typeof insertPayableSchema>;
export type CashFlow = typeof cashFlow.$inferSelect;
export type InsertCashFlow = z.infer<typeof insertCashFlowSchema>;
