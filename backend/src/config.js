import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5050,
  cosmos: {
    endpoint: process.env.COSMOS_DB_ENDPOINT || '',
    key: process.env.COSMOS_DB_KEY || '',
    databaseId: process.env.COSMOS_DB_DATABASE_ID || 'underwriting-db',
    containerId: process.env.COSMOS_DB_CONTAINER_ID || 'policies',
    partitionKey: '/policyType'
  },
  serviceBus: {
    connectionString: process.env.SERVICE_BUS_CONNECTION_STRING || '',
    queueName: process.env.SERVICE_BUS_QUEUE_NAME || 'policy-submissions'
  }
};
