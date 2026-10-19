import { app } from '@azure/functions';
import { writePolicyToFabricBronze } from '../fabricWriter.js';

app.serviceBusQueue('processPolicySubmission', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'policy-submissions',
  handler: async (message, context) => {
    context.log('----------------------------------------------------');
    context.log('⚡ [Azure Function] Service Bus Trigger Activated!');
    
    try {
      const policy = typeof message === 'string' ? JSON.parse(message) : message;
      context.log(`📥 Ingesting Policy ID: ${policy.id || policy.policyId}`);

      const result = await writePolicyToFabricBronze(policy);
      context.log(`🎉 Ingest complete! Landed at: ${result.filePath}`);
      context.log('----------------------------------------------------');
    } catch (err) {
      context.error('❌ [Azure Function] Error writing to Fabric Lakehouse:', err.message);
      throw err; // Trigger Service Bus retry or dead-letter queue if unhandled
    }
  }
});
