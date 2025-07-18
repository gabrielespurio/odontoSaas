import { db } from '../server/db';
import { cashFlow, receivables, payables } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function syncCashFlow() {
  try {
    console.log('Sincronizando fluxo de caixa com contas pagas...');
    
    // Limpar entradas de teste antigas
    await db.delete(cashFlow);
    console.log('Entradas antigas removidas');
    
    // Buscar todas as contas a receber pagas
    const paidReceivables = await db.select().from(receivables).where(eq(receivables.status, 'paid'));
    console.log(`Encontradas ${paidReceivables.length} contas a receber pagas`);
    
    // Buscar todas as contas a pagar pagas
    const paidPayables = await db.select().from(payables).where(eq(payables.status, 'paid'));
    console.log(`Encontradas ${paidPayables.length} contas a pagar pagas`);
    
    // Criar entradas para contas a receber pagas
    for (const receivable of paidReceivables) {
      if (receivable.paymentDate) {
        await db.insert(cashFlow).values({
          type: 'income',
          amount: receivable.amount,
          description: `Recebimento: ${receivable.description || 'Conta a receber'}`,
          date: receivable.paymentDate,
          category: 'receivable',
          receivableId: receivable.id,
          payableId: null,
        });
        console.log(`Entrada criada para recebimento: R$ ${receivable.amount}`);
      }
    }
    
    // Criar entradas para contas a pagar pagas
    for (const payable of paidPayables) {
      if (payable.paymentDate) {
        await db.insert(cashFlow).values({
          type: 'expense',
          amount: `-${payable.amount}`,
          description: `Pagamento: ${payable.description}`,
          date: payable.paymentDate,
          category: 'payable',
          receivableId: null,
          payableId: payable.id,
        });
        console.log(`Entrada criada para pagamento: R$ -${payable.amount}`);
      }
    }
    
    // Verificar o resultado final
    const totalEntries = await db.select().from(cashFlow);
    console.log(`\nTotal de entradas no fluxo de caixa: ${totalEntries.length}`);
    
    // Calcular saldo
    const totalIncome = totalEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const totalExpense = totalEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    console.log(`Total entradas: R$ ${totalIncome.toFixed(2)}`);
    console.log(`Total saídas: R$ ${Math.abs(totalExpense).toFixed(2)}`);
    console.log(`Saldo atual: R$ ${(totalIncome + totalExpense).toFixed(2)}`);
    
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
  }
}

syncCashFlow();