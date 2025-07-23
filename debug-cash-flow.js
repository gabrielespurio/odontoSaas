import pkg from 'pg';
const { Pool } = pkg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function debugCashFlow() {
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('=== DEBUGGING CASH FLOW ===');
    
    // 1. Verificar todas as entradas no cash_flow
    console.log('\n1. Entradas no cash_flow:');
    const cashFlowResult = await pool.query('SELECT * FROM cash_flow ORDER BY created_at DESC;');
    console.log(`Total de entradas: ${cashFlowResult.rows.length}`);
    cashFlowResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Type: ${row.type}, Amount: ${row.amount}, Description: ${row.description}, Company: ${row.company_id}, Date: ${row.date}`);
    });
    
    // 2. Verificar contas a receber pagas
    console.log('\n2. Contas a receber pagas:');
    const paidReceivables = await pool.query('SELECT * FROM receivables WHERE status = $1 ORDER BY payment_date DESC;', ['paid']);
    console.log(`Total de contas pagas: ${paidReceivables.rows.length}`);
    paidReceivables.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Amount: ${row.amount}, Company: ${row.company_id}, Payment Date: ${row.payment_date}`);
    });
    
    // 3. Verificar se há problema de company_id
    console.log('\n3. Company IDs em cash_flow:');
    const companyIds = await pool.query('SELECT DISTINCT company_id FROM cash_flow;');
    console.log('Company IDs únicos no cash_flow:', companyIds.rows.map(r => r.company_id));
    
    // 4. Verificar company_id do usuário atual
    console.log('\n4. Companies disponíveis:');
    const companies = await pool.query('SELECT id, name FROM companies;');
    companies.rows.forEach(row => {
      console.log(`Company ID: ${row.id}, Name: ${row.name}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

debugCashFlow();