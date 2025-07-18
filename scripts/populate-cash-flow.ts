import { db } from '../server/db';
import { cashFlow } from '../shared/schema';

async function populateCashFlow() {
  try {
    console.log('Criando entradas de teste no cash_flow...');
    
    // Criar algumas entradas de teste para verificar se o sistema está funcionando
    const testEntries = [
      {
        type: 'income',
        amount: '500.00',
        description: 'Teste - Recebimento de consulta',
        date: '2025-01-18',
        category: 'receivable',
        receivableId: null,
        payableId: null,
      },
      {
        type: 'expense', 
        amount: '-200.00',
        description: 'Teste - Pagamento de material',
        date: '2025-01-18',
        category: 'payable',
        receivableId: null,
        payableId: null,
      },
      {
        type: 'income',
        amount: '750.00',
        description: 'Teste - Recebimento procedimento',
        date: '2025-01-17',
        category: 'receivable',
        receivableId: null,
        payableId: null,
      }
    ];
    
    for (const entry of testEntries) {
      await db.insert(cashFlow).values(entry);
      console.log(`Criada entrada: ${entry.description} - ${entry.amount}`);
    }
    
    // Verificar as entradas criadas
    const entries = await db.select().from(cashFlow);
    console.log(`Total de entradas no cash_flow: ${entries.length}`);
    
    console.log('Entradas de teste criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar entradas:', error);
  }
}

populateCashFlow();