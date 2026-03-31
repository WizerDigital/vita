import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { query } from '../config/db.js';
import { generateEmbedding, chatCompletion, summarizeConversation } from './llm.js';
import { buildContext } from './prompts.js';
import { agentTools, executeTool } from './tools.js';
import { sendText, startTyping, stopTyping } from '../api/waha.js';
import dotenv from 'dotenv';

dotenv.config();

const chatWorker = new Worker('chat_queue', async job => {
  const { tenantId, contactId, phone, session } = job.data;
  const lockKey = `lock:${tenantId}:${contactId}`;

  // Tenta adquirir um lock para garantir processamento sequencial por usuário
  const acquired = await redis.set(lockKey, '1', 'EX', 120, 'NX');
  if (!acquired) {
    // Silencia o log de reagendamento para não poluir o terminal quando o usuário envia várias mensagens rápidas
    throw new Error('Locked'); // Força o BullMQ a tentar novamente com backoff
  }

  try {
    while (true) {
      const userQueueKey = `user_queue:${tenantId}:${contactId}`;
      const messageText = await redis.lpop(userQueueKey);
      
      if (!messageText) {
        break; // Fila vazia, encerra o loop
      }

      console.log(`[Worker] Processando mensagem para ${contactId}: ${messageText}`);

      await startTyping(session, contactId);

      const userEmbedding = await generateEmbedding(messageText);
      await query(
        `INSERT INTO conversation_messages (tenant_id, contact_id, role, content, embedding) VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, contactId, 'user', messageText, `[${userEmbedding.join(',')}]`]
      );

      const { messages, oldSummary, recentMessagesText } = await buildContext(tenantId, contactId, messageText, userEmbedding);

      let aiResponse = await chatCompletion(messages, agentTools);
      let finalAssistantText = aiResponse.content;

      while (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        messages.push(aiResponse);

        for (const toolCall of aiResponse.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = toolCall.function.arguments;
          
          console.log(`[Worker] IA invocando Tool: ${functionName}`);
          const toolResult = await executeTool(functionName, functionArgs, tenantId, contactId);

          await query(
            `INSERT INTO tool_calls (tenant_id, contact_id, tool_name, tool_args, tool_result) VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, contactId, functionName, functionArgs, JSON.stringify(toolResult)]
          );
          
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: toolResult,
          });
        }

        aiResponse = await chatCompletion(messages, agentTools);
        finalAssistantText = aiResponse.content;
      }

      const pauseCheck = await query(`SELECT is_bot_paused FROM conversation_summaries WHERE tenant_id = $1 AND contact_id = $2`, [tenantId, contactId]);
      if (pauseCheck.rows.length > 0 && pauseCheck.rows[0].is_bot_paused && !finalAssistantText) {
        console.log(`[Worker] Bot pausado durante a execução de tool. Nenhuma resposta será enviada.`);
        await stopTyping(session, contactId);
        continue;
      }

      if (!finalAssistantText) {
        finalAssistantText = "Desculpe, ocorreu um erro ao processar sua solicitação.";
      }

      await redis.setex(`bot_sent:${contactId}`, 60, 'true');
      
      const typingDelay = Math.min(finalAssistantText.length * 20, 3000); 
      await new Promise(r => setTimeout(r, typingDelay));
      
      await stopTyping(session, contactId);
      await sendText(session, contactId, finalAssistantText);

      const assistantEmbedding = await generateEmbedding(finalAssistantText);
      await query(
        `INSERT INTO conversation_messages (tenant_id, contact_id, role, content, embedding) VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, contactId, 'assistant', finalAssistantText, `[${assistantEmbedding.join(',')}]`]
      );

      // Espera a sumarização para manter o contexto consistente na próxima iteração da fila
      try {
        const newSummary = await summarizeConversation(`${recentMessagesText}\nUser: ${messageText}\nAssistant: ${finalAssistantText}`, oldSummary);
        await query(
          `INSERT INTO conversation_summaries (tenant_id, contact_id, summary) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (tenant_id, contact_id) DO UPDATE SET summary = EXCLUDED.summary`,
          [tenantId, contactId, newSummary]
        );
      } catch (sumErr) {
        console.error(`[Worker] Erro ao sumarizar:`, sumErr);
      }

      console.log(`[Worker] Resposta enviada e processamento concluído para a mensagem atual de ${contactId}.`);
    }
  } catch (error) {
    if (error.message !== 'Locked') {
      console.error(`[Worker] Erro ao processar chat para ${contactId}:`, error);
    }
    throw error;
  } finally {
    if (acquired) {
      await redis.del(lockKey);
    }
  }
}, { 
  connection: redis,
  concurrency: 100 // Processa até 100 usuários simultaneamente para alta escalabilidade
});

chatWorker.on('failed', (job, err) => {
  if (err.message !== 'Locked') {
    console.error(`Job ${job?.id} falhou:`, err.message);
  }
});

console.log('[Worker] BullMQ Worker de chat iniciado.');
