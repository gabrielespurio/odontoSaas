import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb";

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Iniciando limpeza da base de dados...');
    
    // Delete data from all tables (keeping admin user)
    console.log('🗑️  Removendo dados de teste...');
    
    // Delete in correct order to respect foreign key constraints
    await client.query('DELETE FROM cash_flow;');
    await client.query('DELETE FROM receivables;');
    await client.query('DELETE FROM payables;');
    await client.query('DELETE FROM financial;');
    await client.query('DELETE FROM dental_chart;');
    await client.query('DELETE FROM anamnese;');
    await client.query('DELETE FROM consultations;');
    await client.query('DELETE FROM appointments;');
    await client.query('DELETE FROM patients;');
    await client.query('DELETE FROM procedures;');
    
    // Keep admin user but remove test users
    await client.query(`DELETE FROM users WHERE username != 'admin';`);
    
    // Reset sequences to start from 1 (except users to preserve admin)
    console.log('🔢 Resetando sequências...');
    
    await client.query('ALTER SEQUENCE patients_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE appointments_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE consultations_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE procedures_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE dental_chart_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE anamnese_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE financial_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE receivables_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE payables_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE cash_flow_id_seq RESTART WITH 1;');
    
    // Verify cleanup
    console.log('✅ Verificando limpeza...');
    
    const counts = await client.query(`
      SELECT 
        'patients' as table_name, COUNT(*) as count FROM patients
      UNION ALL
      SELECT 'appointments', COUNT(*) FROM appointments
      UNION ALL
      SELECT 'consultations', COUNT(*) FROM consultations
      UNION ALL
      SELECT 'procedures', COUNT(*) FROM procedures
      UNION ALL
      SELECT 'users', COUNT(*) FROM users
      UNION ALL
      SELECT 'receivables', COUNT(*) FROM receivables
      UNION ALL
      SELECT 'payables', COUNT(*) FROM payables
      UNION ALL
      SELECT 'cash_flow', COUNT(*) FROM cash_flow
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Contagem após limpeza:');
    counts.rows.forEach(row => {
      console.log(`${row.table_name}: ${row.count} registros`);
    });
    
    console.log('\n🎉 Base de dados limpa com sucesso!');
    console.log('👤 Usuário admin mantido para acesso ao sistema');
    console.log('🏥 Categorias de procedimentos mantidas para facilitar configuração');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase()
  .then(() => {
    console.log('✨ Limpeza concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na limpeza:', error);
    process.exit(1);
  });