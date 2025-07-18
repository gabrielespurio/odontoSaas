#!/usr/bin/env tsx

import { db } from "../server/db";
import { users } from "../shared/schema";
import { hash } from "bcrypt";
import { eq } from "drizzle-orm";

async function resetAdminPassword() {
  try {
    const hashedPassword = await hash("admin123", 10);
    
    // Update admin password
    const updated = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, "admin"))
      .returning();

    if (updated.length > 0) {
      console.log("Admin password reset successfully!");
    } else {
      console.log("Admin user not found. Creating new admin user...");
      
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        name: "Administrador",
        email: "admin@odontosync.com",
        role: "admin",
        forcePasswordChange: false,
        dataScope: "all"
      });
      
      console.log("Admin user created successfully!");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error resetting admin password:", error);
    process.exit(1);
  }
}

resetAdminPassword();