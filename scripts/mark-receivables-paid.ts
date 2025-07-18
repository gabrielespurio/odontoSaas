import { db } from '../server/db';
import { receivables, cashFlow } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function markReceivablesPaid() {
  try {
    console.log('Marcando algumas contas a receber como pagas para teste...');
    
    // Buscar algumas contas pendentes
    const pendingReceivables = await db.select().from(receivables).where(eq(receivables.status, 'pending')).limit(3);
    console.log(`Encontradas ${pendingReceivables.length} contas pendentes`);
    
    for (const receivable of pendingReceivables) {
      // Marcar como paga
      await db.update(receivables)
        .set({
          status: 'paid',
          paymentDate: '2025-01-18',
          paymentMethod: 'pix'
        })
        .where(eq(receivables.id, receivable.id));
      
      // Criar entrada no fluxo de caixa
      await db.insert(cashFlow).values({
        type: 'income',
        amount: receivable.amount,
        description: `Recebimento: ${receivable.description || 'Conta a receber'}`,
        date: '2025-01-18',
        category: 'receivable',
        receivableId: receivable.id,
        payableId: null,
      });
      
      console.log(`Conta marcada como paga: R$ ${receivable.amount}`);
    }
    
    // Verificar resultado
    const totalCashFlow = await db.select().from(cashFlow);
    console.log(`\nTotal de entradas no fluxo de caixa: ${totalCashFlow.length}`);
    
    const totalIncome = totalCashFlow
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const totalExpense = totalCashFlow
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    console.log(`Total entradas: R$ ${totalIncome.toFixed(2)}`);
    console.log(`Total saídas: R$ ${Math.abs(totalExpense).toFixed(2)}`);
    console.log(`Saldo atual: R$ ${(totalIncome + totalExpense).toFixed(2)}`);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

markReceivablesPaid();