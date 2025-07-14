import { db } from "../server/db.ts";
import { users } from "../shared/schema.ts";

async function migrateUserRole() {
  try {
    console.log("Iniciando migração do campo role para texto...");
    
    // Execute the SQL to change the column type
    await db.execute(`ALTER TABLE users ALTER COLUMN role TYPE text;`);
    
    console.log("Migração concluída com sucesso!");
    console.log("O campo role agora aceita perfis customizados.");
    
    // Verify the change by selecting some users
    const usersData = await db.select().from(users).limit(5);
    console.log("Usuários atuais:", usersData);
    
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a migração:", error);
    process.exit(1);
  }
}

migrateUserRole();