import { db } from "../server/db.ts";
import { users } from "../shared/schema.ts";

async function addDataScopeField() {
  try {
    console.log("Adicionando campo data_scope à tabela users...");
    
    // Add the new column with default value "all"
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS data_scope text NOT NULL DEFAULT 'all';`);
    
    console.log("Campo data_scope adicionado com sucesso!");
    
    // Update admin users to have "all" scope by default
    await db.execute(`UPDATE users SET data_scope = 'all' WHERE role = 'admin';`);
    
    console.log("Usuários admin configurados com escopo 'all'");
    
    // Verify the change
    const usersData = await db.select().from(users).limit(5);
    console.log("Usuários atualizados:", usersData.map(u => ({ 
      id: u.id, 
      name: u.name, 
      role: u.role, 
      dataScope: u.dataScope 
    })));
    
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a migração:", error);
    process.exit(1);
  }
}

addDataScopeField();