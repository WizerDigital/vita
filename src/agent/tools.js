import { query } from '../config/db.js';

export const agentTools = [
  // --- TRANSACTIONS ---
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: 'Registra uma nova despesa ou receita. Para compras parceladas, defina is_installment como true, informe total_installments, e o valor (amount) de cada parcela ou o total_amount.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Valor da transação ou valor da parcela (se for parcelado e total_amount for omitido)' },
          type: { type: 'string', enum: ['expense', 'income'], description: 'Tipo: despesa ou receita' },
          category_id: { type: 'string', description: 'UUID da categoria (obrigatório)' },
          description: { type: 'string', description: 'Descrição da transação' },
          date: { type: 'string', description: 'Data da transação (YYYY-MM-DD)' },
          is_installment: { type: 'boolean', description: 'Verdadeiro se for uma compra parcelada' },
          total_installments: { type: 'number', description: 'Número total de parcelas (padrão 1)' },
          total_amount: { type: 'number', description: 'Valor total da compra (se for parcelado)' }
        },
        required: ['amount', 'type', 'category_id', 'description', 'date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description: 'Busca transações registradas do usuário (despesas ou receitas).',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'number', description: 'Mês (1-12)' },
          year: { type: 'number', description: 'Ano (YYYY)' },
          type: { type: 'string', enum: ['expense', 'income'], description: 'Filtrar por tipo (opcional)' },
          limit: { type: 'number', description: 'Limite de registros (padrão 10)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description: 'Atualiza uma transação existente pelo seu ID.',
      parameters: {
        type: 'object',
        properties: {
          transaction_id: { type: 'string', description: 'UUID da transação' },
          amount: { type: 'number', description: 'Novo valor' },
          category_id: { type: 'string', description: 'Nova categoria' },
          description: { type: 'string', description: 'Nova descrição' },
          date: { type: 'string', description: 'Nova data (YYYY-MM-DD)' }
        },
        required: ['transaction_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_transaction',
      description: 'Exclui uma transação existente pelo seu ID.',
      parameters: {
        type: 'object',
        properties: {
          transaction_id: { type: 'string', description: 'UUID da transação' }
        },
        required: ['transaction_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_financial_summary',
      description: 'Obtém o resumo financeiro (total de despesas, receitas, e saldo) de um determinado mês.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'number', description: 'Mês (1-12)' },
          year: { type: 'number', description: 'Ano (YYYY)' }
        },
        required: ['month', 'year']
      }
    }
  },

  // --- REMINDERS ---
  {
    type: 'function',
    function: {
      name: 'add_reminder',
      description: 'Cria um lembrete para uma data e hora específicas.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Descrição ou texto do lembrete' },
          remind_at: { type: 'string', description: 'Data e hora no formato ISO 8601 (ex: 2024-10-25T15:30:00Z)' }
        },
        required: ['description', 'remind_at']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_reminders',
      description: 'Lista os lembretes pendentes do usuário.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_reminder',
      description: 'Atualiza a data/hora ou descrição de um lembrete existente.',
      parameters: {
        type: 'object',
        properties: {
          reminder_id: { type: 'string', description: 'UUID do lembrete' },
          description: { type: 'string', description: 'Nova descrição' },
          remind_at: { type: 'string', description: 'Nova data/hora (ISO 8601)' }
        },
        required: ['reminder_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_reminder',
      description: 'Exclui um lembrete existente pelo seu ID.',
      parameters: {
        type: 'object',
        properties: {
          reminder_id: { type: 'string', description: 'UUID do lembrete' }
        },
        required: ['reminder_id']
      }
    }
  }
];

export async function executeTool(toolName, argsArgs, tenantId, contactId) {
  try {
    const args = JSON.parse(argsArgs);
    console.log(`[Tool Exec] ${toolName}`, args);

    // --- TRANSACTIONS ---
    if (toolName === 'add_transaction') {
      const { amount, type, category_id, description, date, is_installment, total_installments, total_amount } = args;
      const isInst = is_installment || false;
      const totInst = isInst ? (total_installments || 1) : 1;
      let totAmt = total_amount || amount;
      let instAmt = amount;

      if (isInst && !total_amount) {
        totAmt = amount * totInst;
      } else if (isInst && total_amount && !args.amount) {
        instAmt = total_amount / totInst;
      }

      if (isInst && totInst > 1) {
        // Criar múltiplas parcelas
        const dt = new Date(date);
        for (let i = 1; i <= totInst; i++) {
          const installmentDate = new Date(dt.getFullYear(), dt.getMonth() + (i - 1), dt.getDate()).toISOString().split('T')[0];
          await query(
            `INSERT INTO transactions (contact_id, amount, type, category_id, description, date, is_installment, installment_number, total_installments, total_amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [contactId, instAmt, type, category_id, `${description} (Parcela ${i}/${totInst})`, installmentDate, true, i, totInst, totAmt]
          );
        }
        return JSON.stringify({ status: "success", message: `${totInst} parcelas registradas com sucesso.` });
      } else {
        // Transação única
        await query(
          `INSERT INTO transactions (contact_id, amount, type, category_id, description, date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [contactId, amount, type, category_id, description, date]
        );
        return JSON.stringify({ status: "success", message: "Transação registrada com sucesso." });
      }
    }

    if (toolName === 'get_transactions') {
      let sql = `SELECT t.id, t.amount, t.type, c.name as category, t.description, t.date, t.is_installment, t.installment_number, t.total_installments 
                 FROM transactions t LEFT JOIN categories c ON t.category_id = c.id 
                 WHERE t.contact_id = $1`;
      const params = [contactId];
      let paramCount = 2;

      if (args.month && args.year) {
        sql += ` AND EXTRACT(MONTH FROM t.date) = $${paramCount++} AND EXTRACT(YEAR FROM t.date) = $${paramCount++}`;
        params.push(args.month, args.year);
      }
      if (args.type) {
        sql += ` AND t.type = $${paramCount++}`;
        params.push(args.type);
      }
      sql += ` ORDER BY t.date DESC LIMIT $${paramCount}`;
      params.push(args.limit || 10);

      const res = await query(sql, params);
      return JSON.stringify({ transactions: res.rows });
    }

    if (toolName === 'update_transaction') {
      const fields = [];
      const params = [args.transaction_id, contactId];
      let paramCount = 3;

      if (args.amount) { fields.push(`amount = $${paramCount++}`); params.push(args.amount); }
      if (args.category_id) { fields.push(`category_id = $${paramCount++}`); params.push(args.category_id); }
      if (args.description) { fields.push(`description = $${paramCount++}`); params.push(args.description); }
      if (args.date) { fields.push(`date = $${paramCount++}`); params.push(args.date); }
      fields.push(`updated_at = NOW()`);

      if (fields.length === 1) return JSON.stringify({ error: "Nenhum campo para atualizar." });

      const res = await query(
        `UPDATE transactions SET ${fields.join(', ')} WHERE id = $1 AND contact_id = $2 RETURNING id`,
        params
      );
      if (res.rowCount === 0) return JSON.stringify({ error: "Transação não encontrada ou não pertence a este usuário." });
      return JSON.stringify({ status: "success", message: "Transação atualizada." });
    }

    if (toolName === 'delete_transaction') {
      const res = await query(`DELETE FROM transactions WHERE id = $1 AND contact_id = $2 RETURNING id`, [args.transaction_id, contactId]);
      if (res.rowCount === 0) return JSON.stringify({ error: "Transação não encontrada ou não pertence a este usuário." });
      return JSON.stringify({ status: "success", message: "Transação excluída." });
    }

    if (toolName === 'get_financial_summary') {
      const res = await query(
        `SELECT type, SUM(amount) as total 
         FROM transactions 
         WHERE contact_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
         GROUP BY type`,
        [contactId, args.month, args.year]
      );
      const summary = { expense: 0, income: 0, balance: 0 };
      res.rows.forEach(r => {
        if (r.type === 'expense') summary.expense = parseFloat(r.total);
        if (r.type === 'income') summary.income = parseFloat(r.total);
      });
      summary.balance = summary.income - summary.expense;
      return JSON.stringify(summary);
    }

    // --- REMINDERS ---
    if (toolName === 'add_reminder') {
      await query(
        `INSERT INTO reminders (contact_id, description, remind_at) VALUES ($1, $2, $3)`,
        [contactId, args.description, args.remind_at]
      );
      return JSON.stringify({ status: "success", message: "Lembrete agendado com sucesso." });
    }

    if (toolName === 'get_reminders') {
      const res = await query(
        `SELECT id, description, remind_at FROM reminders WHERE contact_id = $1 AND is_executed = FALSE ORDER BY remind_at ASC`,
        [contactId]
      );
      return JSON.stringify({ reminders: res.rows });
    }

    if (toolName === 'update_reminder') {
      const fields = [];
      const params = [args.reminder_id, contactId];
      let paramCount = 3;

      if (args.description) { fields.push(`description = $${paramCount++}`); params.push(args.description); }
      if (args.remind_at) { fields.push(`remind_at = $${paramCount++}`); params.push(args.remind_at); }
      fields.push(`updated_at = NOW()`);

      if (fields.length === 1) return JSON.stringify({ error: "Nenhum campo para atualizar." });

      const res = await query(
        `UPDATE reminders SET ${fields.join(', ')} WHERE id = $1 AND contact_id = $2 RETURNING id`,
        params
      );
      if (res.rowCount === 0) return JSON.stringify({ error: "Lembrete não encontrado ou não pertence a este usuário." });
      return JSON.stringify({ status: "success", message: "Lembrete atualizado." });
    }

    if (toolName === 'delete_reminder') {
      const res = await query(`DELETE FROM reminders WHERE id = $1 AND contact_id = $2 RETURNING id`, [args.reminder_id, contactId]);
      if (res.rowCount === 0) return JSON.stringify({ error: "Lembrete não encontrado ou não pertence a este usuário." });
      return JSON.stringify({ status: "success", message: "Lembrete excluído." });
    }

    return JSON.stringify({ error: "Ferramenta não encontrada." });
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({ error: `Erro ao executar ferramenta: ${error.message}` });
  }
}
