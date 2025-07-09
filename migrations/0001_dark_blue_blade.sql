ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'agendado';--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "status" "appointment_status" DEFAULT 'agendado' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."appointments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."consultations" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."appointment_status";--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('agendado', 'em_atendimento', 'concluido', 'cancelado');--> statement-breakpoint
ALTER TABLE "public"."appointments" ALTER COLUMN "status" SET DATA TYPE "public"."appointment_status" USING "status"::"public"."appointment_status";--> statement-breakpoint
ALTER TABLE "public"."consultations" ALTER COLUMN "status" SET DATA TYPE "public"."appointment_status" USING "status"::"public"."appointment_status";