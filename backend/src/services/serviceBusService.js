import { ServiceBusClient } from '@azure/service-bus';
import { config } from '../config.js';

let sbClient = null;
let sender = null;
let isMock = false;

export async function initializeServiceBus() {
  if (!config.serviceBus.connectionString) {
    console.warn('⚠️  [Service Bus] Missing SERVICE_BUS_CONNECTION_STRING in .env. Running in MOCK mode.');
    isMock = true;
    return;
  }

  try {
    sbClient = new ServiceBusClient(config.serviceBus.connectionString);
    sender = sbClient.createSender(config.serviceBus.queueName);
    isMock = false;
    console.log(`✅ [Service Bus] Connected to Queue: "${config.serviceBus.queueName}"`);
  } catch (error) {
    console.error('❌ [Service Bus] Failed to initialize Service Bus client:', error.message);
    console.warn('⚠️  [Service Bus] Falling back to MOCK mode.');
    isMock = true;
  }
}

export async function sendPolicyMessage(policy) {
  const message = {
    body: policy,
    contentType: 'application/json',
    subject: 'PolicySubmission',
    messageId: policy.id,
    applicationProperties: {
      policyType: policy.coverage?.policyType || 'General',
      submissionDate: policy.submissionDate || new Date().toISOString(),
      source: 'underwriter-portal'
    }
  };

  if (isMock) {
    console.log(`📨 [Service Bus Mock] Simulated dispatch of message for Policy ID: ${policy.id}`);
    return { status: 'mock_sent', messageId: policy.id };
  }

  await sender.sendMessages(message);
  console.log(`🚀 [Service Bus] Message dispatched to queue "${config.serviceBus.queueName}" for Policy ID: ${policy.id}`);
  return { status: 'sent', messageId: policy.id };
}

export function isServiceBusMock() {
  return isMock;
}
