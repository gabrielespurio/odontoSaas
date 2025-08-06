import { 
  pgTable, 
  text, 
  varchar,
  serial, 
  integer, 
  boolean, 
  timestamp, 
  decimal,
  date,
  jsonb,
  pgEnum,
  unique
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
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "sent", "confirmed", "partial", "received", "cancelled"]);
export const receivingStatusEnum = pgEnum("receiving_status", ["pending", "partial", "received", "cancelled"]);
export const toothConditionEnum = pgEnum("tooth_condition", ["healthy", "carie", "restoration", "extraction", "planned_treatment", "completed_treatment"]);
export const productUnitEnum = pgEnum("product_unit", ["unit", "kg", "g", "l", "ml", "box", "package", "meter", "cm"]);

// Companies table for SaaS multi-tenancy
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tradeName: text("trade_name"), // Nome fantasia
  cnpj: text("cnpj").unique(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  // Responsible person information
  responsibleName: text("responsible_name").notNull(),
  responsiblePhone: text("responsible_phone").notNull(),
  // Address fields
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  // Status
  isActive: boolean("is_active").notNull().default(true),
  // Dates
  trialEndDate: date("trial_end_date"),
  subscriptionStartDate: date("subscription_start_date"),
  subscriptionEndDate: date("subscription_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("dentist"), // Changed to text to support custom profiles
  companyId: integer("company_id"), // Null for system admin, FK for company users
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  dataScope: text("data_scope").notNull().default("all"), // "all" or "own" - defines if user can see all clinic data or only own data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patients table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
  name: text("name").notNull(),
  cpf: text("cpf").notNull(),
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
}, (table) => ({
  // Unique constraint per company (same CPF can exist in different companies)
  uniqueCpfPerCompany: unique().on(table.cpf, table.companyId),
}));

// Procedure Categories table
export const procedureCategories = pgTable("procedure_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint per company (same name can exist in different companies)
  uniqueNamePerCompany: unique().on(table.name, table.companyId),
}));

// User Profiles table
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
  name: text("name").notNull(),
  description: text("description"),
  modules: jsonb("modules").notNull().default('[]'), // Array of module names
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint per company (same name can exist in different companies)
  uniqueNamePerCompany: unique().on(table.name, table.companyId),
}));

// Procedures table
export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
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
  companyId: integer("company_id").notNull(), // FK to companies table
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
  companyId: integer("company_id").notNull(), // FK to companies table
  attendanceNumber: varchar("attendance_number", { length: 6 }).unique(),
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
  companyId: integer("company_id").notNull(), // FK to companies table
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
  companyId: integer("company_id").notNull(), // FK to companies table
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
  companyId: integer("company_id").notNull(), // FK to companies table
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
  companyId: integer("company_id").notNull(), // FK to companies table
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
  accountType: varchar("account_type", { length: 20 }).notNull().default("clinic"), // "clinic" ou "dentist"
  dentistId: integer("dentist_id"), // ID do dentista quando accountType = "dentist"
  createdBy: integer("created_by"), // ID do usuário que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Movimentação de Caixa (Cash Flow)
export const cashFlow = pgTable("cash_flow", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
  type: varchar("type", { length: 20 }).notNull(), // "income" ou "expense"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: date("date").notNull(),
  category: varchar("category", { length: 100 }),
  receivableId: integer("receivable_id"), // FK para receivables
  payableId: integer("payable_id"), // FK para payables
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase module tables
// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  email: text("email"),
  phone: text("phone").notNull(),
  contactPerson: text("contact_person"),
  // Address fields
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  // Status and notes
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdBy: integer("created_by"), // ID do usuário que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint per company (same CNPJ can exist in different companies if provided)
  uniqueCnpjPerCompany: unique().on(table.cnpj, table.companyId),
}));

// Purchase Orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
  supplierId: integer("supplier_id").notNull(), // FK to suppliers table
  orderNumber: text("order_number").notNull(), // Auto-generated unique order number
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  status: purchaseOrderStatusEnum("status").notNull().default("draft"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: integer("created_by"), // ID do usuário que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique order number per company
  uniqueOrderNumberPerCompany: unique().on(table.orderNumber, table.companyId),
}));

// Purchase Order Items table
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull(), // FK to purchase_orders table
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

// Receivings table (recebimentos)
export const receivings = pgTable("receivings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
  purchaseOrderId: integer("purchase_order_id").notNull(), // FK to purchase_orders table
  supplierId: integer("supplier_id").notNull(), // FK to suppliers table
  receivingNumber: text("receiving_number").notNull(), // Auto-generated unique receiving number
  receivingDate: date("receiving_date"),
  status: receivingStatusEnum("status").notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: integer("created_by"), // ID do usuário que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique receiving number per company
  uniqueReceivingNumberPerCompany: unique().on(table.receivingNumber, table.companyId),
}));

// Receiving Items table
export const receivingItems = pgTable("receiving_items", {
  id: serial("id").primaryKey(),
  receivingId: integer("receiving_id").notNull(), // FK to receivings table
  purchaseOrderItemId: integer("purchase_order_item_id").notNull(), // FK to purchase_order_items table
  description: text("description").notNull(),
  quantityOrdered: decimal("quantity_ordered", { precision: 10, scale: 2 }).notNull(),
  quantityReceived: decimal("quantity_received", { precision: 10, scale: 2 }).notNull().default("0"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

// Manter tabela financial para compatibilidade (deprecated)
export const financial = pgTable("financial", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // FK to companies table
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
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  patients: many(patients),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  appointments: many(appointments),
  consultations: many(consultations),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  company: one(companies, {
    fields: [patients.companyId],
    references: [companies.id],
  }),
  appointments: many(appointments),
  consultations: many(consultations),
  dentalChart: many(dentalChart),
  anamnese: many(anamnese),
  financial: many(financial),
  receivables: many(receivables),
}));

export const procedureCategoriesRelations = relations(procedureCategories, ({ one, many }) => ({
  company: one(companies, {
    fields: [procedureCategories.companyId],
    references: [companies.id],
  }),
  procedures: many(procedures),
}));

export const proceduresRelations = relations(procedures, ({ one, many }) => ({
  company: one(companies, {
    fields: [procedures.companyId],
    references: [companies.id],
  }),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  company: one(companies, {
    fields: [appointments.companyId],
    references: [companies.id],
  }),
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
  company: one(companies, {
    fields: [consultations.companyId],
    references: [companies.id],
  }),
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
  company: one(companies, {
    fields: [dentalChart.companyId],
    references: [companies.id],
  }),
  patient: one(patients, {
    fields: [dentalChart.patientId],
    references: [patients.id],
  }),
}));

export const anamneseRelations = relations(anamnese, ({ one }) => ({
  company: one(companies, {
    fields: [anamnese.companyId],
    references: [companies.id],
  }),
  patient: one(patients, {
    fields: [anamnese.patientId],
    references: [patients.id],
  }),
}));

export const financialRelations = relations(financial, ({ one }) => ({
  company: one(companies, {
    fields: [financial.companyId],
    references: [companies.id],
  }),
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
  company: one(companies, {
    fields: [receivables.companyId],
    references: [companies.id],
  }),
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

export const payablesRelations = relations(payables, ({ one, many }) => ({
  company: one(companies, {
    fields: [payables.companyId],
    references: [companies.id],
  }),
  cashFlowEntries: many(cashFlow),
}));

// Purchase module relations
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  company: one(companies, {
    fields: [suppliers.companyId],
    references: [companies.id],
  }),
  purchaseOrders: many(purchaseOrders),
  receivings: many(receivings),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  company: one(companies, {
    fields: [purchaseOrders.companyId],
    references: [companies.id],
  }),
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseOrderItems),
  receivings: many(receivings),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  receivingItems: many(receivingItems),
}));

export const receivingsRelations = relations(receivings, ({ one, many }) => ({
  company: one(companies, {
    fields: [receivings.companyId],
    references: [companies.id],
  }),
  supplier: one(suppliers, {
    fields: [receivings.supplierId],
    references: [suppliers.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [receivings.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  items: many(receivingItems),
}));

export const receivingItemsRelations = relations(receivingItems, ({ one }) => ({
  receiving: one(receivings, {
    fields: [receivingItems.receivingId],
    references: [receivings.id],
  }),
  purchaseOrderItem: one(purchaseOrderItems, {
    fields: [receivingItems.purchaseOrderItemId],
    references: [purchaseOrderItems.id],
  }),
}));

export const cashFlowRelations = relations(cashFlow, ({ one }) => ({
  company: one(companies, {
    fields: [cashFlow.companyId],
    references: [companies.id],
  }),
  receivable: one(receivables, {
    fields: [cashFlow.receivableId],
    references: [receivables.id],
  }),
  payable: one(payables, {
    fields: [cashFlow.payableId],
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
  companyId: true, // Excluir companyId pois será adicionado no backend
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
  attendanceNumber: true,
  createdAt: true,
  updatedAt: true,
  companyId: true, // Excluir companyId pois será adicionado no backend
}).extend({
  date: z.string(), // CORRIGIDO: Manter como string para evitar conversão de timezone
});

export const insertDentalChartSchema = createInsertSchema(dentalChart).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  companyId: true, // Excluir companyId pois será adicionado no backend
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

// Schema que aceita campos individuais do frontend
export const insertAnamneseSchema = createInsertSchema(anamnese).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  companyId: true, // Excluir companyId pois será adicionado no backend
}).extend({
  additionalQuestions: additionalQuestionsSchema.nullable().optional(),
  // Aceitar campos individuais do frontend
  hasHeartProblems: z.boolean().optional(),
  hasDiabetes: z.boolean().optional(),
  hasHypertension: z.boolean().optional(),
  isPregnant: z.boolean().optional(),
  smokingHabits: z.string().optional(),
  bleedingProblems: z.boolean().optional(),
  familyHistory: z.string().optional(),
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
  companyId: true, // Excluir companyId pois será adicionado no backend
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
  companyId: true, // Excluir companyId pois será adicionado no backend
}).extend({
  amount: z.number().positive("Valor deve ser positivo"),
  paymentDate: z.string().optional().nullable(),
  accountType: z.enum(["clinic", "dentist"]).default("clinic"),
  dentistId: z.number().optional().nullable(),
});

export const insertCashFlowSchema = createInsertSchema(cashFlow).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cnpj: z.string().optional(),
  trialEndDate: z.string().optional(),
  subscriptionStartDate: z.string().optional(),
  subscriptionEndDate: z.string().optional(),
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
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

// Purchase module insert schemas
export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  companyId: true, // Excluir companyId pois será adicionado no backend
}).extend({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório").refine((val) => {
    const cleanPhone = val.replace(/\D/g, ''); // Remove all non-digits
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  }, "Telefone deve ter entre 10 e 11 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cnpj: z.string().optional(),
  contactPerson: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().optional(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  companyId: true, // Excluir companyId pois será adicionado no backend
  orderNumber: true, // Auto-generated
}).extend({
  supplierId: z.number().min(1, "Fornecedor é obrigatório"),
  totalAmount: z.number().positive("Valor total deve ser positivo"),
  orderDate: z.string().min(1, "Data do pedido é obrigatória"),
  expectedDeliveryDate: z.string().optional().nullable(),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
}).extend({
  purchaseOrderId: z.number().min(1, "ID do pedido é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  quantity: z.number().positive("Quantidade deve ser positiva"),
  unitPrice: z.number().positive("Preço unitário deve ser positivo"),
  totalPrice: z.number().positive("Preço total deve ser positivo"),
});

export const insertReceivingSchema = createInsertSchema(receivings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  companyId: true, // Excluir companyId pois será adicionado no backend
  receivingNumber: true, // Auto-generated
}).extend({
  purchaseOrderId: z.number().min(1, "Pedido de compra é obrigatório"),
  supplierId: z.number().min(1, "Fornecedor é obrigatório"),
  totalAmount: z.number().positive("Valor total deve ser positivo"),
  receivingDate: z.string().optional().nullable(),
});

export const insertReceivingItemSchema = createInsertSchema(receivingItems).omit({
  id: true,
}).extend({
  receivingId: z.number().min(1, "ID do recebimento é obrigatório"),
  purchaseOrderItemId: z.number().min(1, "ID do item do pedido é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  quantityOrdered: z.number().positive("Quantidade pedida deve ser positiva"),
  quantityReceived: z.number().min(0, "Quantidade recebida deve ser maior ou igual a zero"),
  unitPrice: z.number().positive("Preço unitário deve ser positivo"),
  totalPrice: z.number().positive("Preço total deve ser positivo"),
});

// Purchase module types
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type InsertReceiving = z.infer<typeof insertReceivingSchema>;
export type InsertReceivingItem = z.infer<typeof insertReceivingItemSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type Receiving = typeof receivings.$inferSelect;
export type ReceivingItem = typeof receivingItems.$inferSelect;
export type CashFlow = typeof cashFlow.$inferSelect;
export type InsertCashFlow = z.infer<typeof insertCashFlowSchema>;

// Stock Management Module - Product Categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stock Management Module - Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"), // Stock Keeping Unit
  barcode: text("barcode"),
  unit: productUnitEnum("unit").notNull().default("unit"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  minimumStock: decimal("minimum_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  maximumStock: decimal("maximum_stock", { precision: 10, scale: 2 }),
  supplier: text("supplier"), // Main supplier name
  location: text("location"), // Storage location
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stock Management Module - Stock Movements (for future use)
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  productId: integer("product_id").notNull(),
  movementType: text("movement_type").notNull(), // "in", "out", "adjustment"
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }),
  reason: text("reason"), // Purchase, Sale, Loss, Adjustment, etc.
  referenceDocument: text("reference_document"), // Invoice, PO number, etc.
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stock Management Relations
export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  company: one(companies, {
    fields: [productCategories.companyId],
    references: [companies.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  stockMovements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  company: one(companies, {
    fields: [stockMovements.companyId],
    references: [companies.id],
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}));

// Stock Management Insert Schemas
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  companyId: true,
  createdBy: true,
}).extend({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  companyId: true,
  createdBy: true,
}).extend({
  name: z.string().min(1, "Nome é obrigatório"),
  categoryId: z.number().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.enum(["unit", "box", "tube", "bottle", "pack", "roll", "kg", "g", "ml", "l"]).default("unit"),
  unitPrice: z.number().positive("Preço unitário deve ser positivo"),
  costPrice: z.number().optional(),
  currentStock: z.number().min(0, "Estoque atual deve ser maior ou igual a zero").default(0),
  minimumStock: z.number().min(0, "Estoque mínimo deve ser maior ou igual a zero").default(0),
  maximumStock: z.number().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true,
  companyId: true,
  createdBy: true,
}).extend({
  productId: z.number().min(1, "Produto é obrigatório"),
  movementType: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().positive("Quantidade deve ser positiva"),
  unitPrice: z.number().optional(),
  totalValue: z.number().optional(),
  reason: z.string().optional(),
  referenceDocument: z.string().optional(),
  notes: z.string().optional(),
});

// Stock Management Types
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
