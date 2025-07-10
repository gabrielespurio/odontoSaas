import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkCategories() {
  try {
    console.log('Verificando categorias de procedimentos...');
    
    const result = await pool.query('SELECT * FROM procedure_categories ORDER BY id');
    
    console.log('Categorias encontradas:');
    console.table(result.rows);
    
    if (result.rows.length > 0) {
      console.log('\nLimpando categorias existentes...');
      await pool.query('DELETE FROM procedure_categories');
      console.log('Categorias removidas com sucesso!');
    } else {
      console.log('Nenhuma categoria encontrada.');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

checkCategories();