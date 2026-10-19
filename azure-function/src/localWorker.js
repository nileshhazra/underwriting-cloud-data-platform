import dotenv from 'dotenv';
dotenv.config();

import { ServiceBusClient } from '@azure/service-bus';
import { writePolicyToFabricBronze } from './fabricWriter.js';

const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
const queueName = process.env.SERVICE_BUS_QUEUE_NAME || 'policy-submissions';

if (!connectionString) {
  console.error('❌ SERVICE_BUS_CONNECTION_STRING is missing in azure-function/.env');
  process.exit(1);
}

const sbClient = new ServiceBusClient(connectionString);
const receiver = sbClient.createReceiver(queueName);

console.log('====================================================');
console.log('⚡ Fabric Bronze Ingestion Worker Started!');
console.log(`📡 Listening for messages on Service Bus Queue: "${queueName}"`);
console.log(`🎯 Destination: Microsoft Fabric Lakehouse -> Files/bronze/policies/...`);
console.log('====================================================');

const myMessageHandler = async (messageReceived) => {
  console.log('\n----------------------------------------------------');
  console.log(`📥 Received message from Service Bus (ID: ${messageReceived.messageId})`);
  
  try {
    const policy = messageReceived.body;
    console.log(`📋 Processing Policy: ${policy.id} (${policy.insured?.businessName || 'Unknown'})`);

    const result = await writePolicyToFabricBronze(policy);
    console.log(`🎉 Success! File written to Fabric Bronze Lakehouse:`);
    console.log(`   Path: ${result.filePath}`);

    // Complete the message so it's removed from Service Bus queue
    await receiver.completeMessage(messageReceived);
    console.log(`✔️  Message marked as complete in Service Bus.`);
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Error processing message:', error);
    // Abandon message so it can be retried
    await receiver.abandonMessage(messageReceived);
  }
};

const myErrorHandler = async (error) => {
  console.error('⚠️ Service Bus Receiver error:', error);
};

// Start listening continuously
receiver.subscribe({
  processMessage: myMessageHandler,
  processError: myErrorHandler
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down worker...');
  await receiver.close();
  await sbClient.close();
  process.exit(0);
});
