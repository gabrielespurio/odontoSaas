#!/usr/bin/env tsx

import { db } from "../server/db";
import { users } from "../shared/schema";
import { hash } from "bcrypt";

async function createAdminUser() {
  try {
    const hashedPassword = await hash("admin123", 10);
    
    const newUser = await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      name: "Administrador",
      email: "admin@odontosync.com",
      role: "admin",
      forcePasswordChange: false,
      dataScope: "all"
    }).onConflictDoNothing().returning();

    if (newUser.length > 0) {
      console.log("Admin user created successfully!");
    } else {
      console.log("Admin user already exists.");
    }

    // Create sample dentist users
    const dentist1Password = await hash("dentista123", 10);
    const dentist2Password = await hash("dentista123", 10);

    await db.insert(users).values([
      {
        username: "dentista1",
        password: dentist1Password,
        name: "Dr. João Silva",
        email: "dentista1@teste.com",
        role: "dentist",
        forcePasswordChange: false,
        dataScope: "own"
      },
      {
        username: "dentista2",
        password: dentist2Password,
        name: "Dra. Maria Santos",
        email: "dentista2@teste.com",
        role: "dentist",
        forcePasswordChange: false,
        dataScope: "all"
      }
    ]).onConflictDoNothing();

    console.log("Sample dentist users created successfully!");
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser();