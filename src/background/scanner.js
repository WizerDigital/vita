import cron from 'node-cron';
import { query } from '../config/db.js';
import { notificationsQueue } from '../config/queues.js';

console.log('[Scanner] Cron jobs de Vita iniciados.');

// Verifica lembretes a cada minuto
cron.schedule('* * * * *', async () => {
  try {
    // console.log('[Scanner] Verificando lembretes pendentes...');
    const res = await query(
      `SELECT id, contact_id, description, remind_at 
       FROM reminders 
       WHERE is_executed = FALSE AND remind_at <= NOW()`
    );

    for (const reminder of res.rows) {
      console.log(`[Scanner] Executando lembrete ${reminder.id} para ${reminder.contact_id}`);
      
      // Adiciona na fila de notificações
      await notificationsQueue.add('send_reminder', {
        contactId: reminder.contact_id,
        message: `⏰ *LEMBRETE:* ${reminder.description}`
      });

      // Marca como executado
      await query(`UPDATE reminders SET is_executed = TRUE, updated_at = NOW() WHERE id = $1`, [reminder.id]);
    }
  } catch (error) {
    console.error('[Scanner] Erro ao buscar lembretes:', error);
  }
});
