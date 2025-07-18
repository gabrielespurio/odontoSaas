import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function testCashFlow() {
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    webSocketConstructor: ws
  });
  
  try {
    console.log('Verificando dados existentes no cash_flow...');
    
    // Verificar se há dados na tabela cash_flow
    const cashFlowResult = await pool.query('SELECT * FROM cash_flow ORDER BY created_at DESC LIMIT 5');
    console.log('Entradas no cash_flow:', cashFlowResult.rows.length);
    if (cashFlowResult.rows.length > 0) {
      console.log('Exemplo de entrada:', cashFlowResult.rows[0]);
    }
    
    // Verificar contas a receber pagas
    const paidReceivables = await pool.query('SELECT * FROM receivables WHERE status = $1', ['paid']);
    console.log('Contas a receber pagas:', paidReceivables.rows.length);
    
    // Verificar contas a pagar pagas  
    const paidPayables = await pool.query('SELECT * FROM payables WHERE status = $1', ['paid']);
    console.log('Contas a pagar pagas:', paidPayables.rows.length);
    
    // Se não há entradas no cash_flow mas há contas pagas, criar entradas de teste
    if (cashFlowResult.rows.length === 0) {
      console.log('Criando entradas de teste no cash_flow...');
      
      // Criar uma entrada de receita de teste
      await pool.query(`
        INSERT INTO cash_flow (type, amount, description, date, category, receivable_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['income', '500.00', 'Teste - Recebimento de consulta', '2025-01-18', 'receivable', null]);
      
      // Criar uma entrada de despesa de teste
      await pool.query(`
        INSERT INTO cash_flow (type, amount, description, date, category, payable_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['expense', '-200.00', 'Teste - Pagamento de material', '2025-01-18', 'payable', null]);
      
      console.log('Entradas de teste criadas!');
    }
    
    // Verificar novamente
    const finalResult = await pool.query('SELECT * FROM cash_flow ORDER BY created_at DESC');
    console.log('Total de entradas após teste:', finalResult.rows.length);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

testCashFlow();