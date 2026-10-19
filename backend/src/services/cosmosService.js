import { CosmosClient } from '@azure/cosmos';
import { config } from '../config.js';

let client = null;
let database = null;
let container = null;
let isMock = false;
const inMemoryStore = [];

export async function initializeCosmos() {
  if (!config.cosmos.endpoint || !config.cosmos.key) {
    console.warn('⚠️  [Cosmos DB] Missing COSMOS_DB_ENDPOINT or COSMOS_DB_KEY in .env. Running in MOCK in-memory mode.');
    isMock = true;
    return;
  }

  try {
    client = new CosmosClient({
      endpoint: config.cosmos.endpoint,
      key: config.cosmos.key
    });

    // Create database if not exists
    const { database: db } = await client.databases.createIfNotExists({
      id: config.cosmos.databaseId
    });
    database = db;

    // Create container if not exists with partition key
    const { container: cont } = await database.containers.createIfNotExists({
      id: config.cosmos.containerId,
      partitionKey: { paths: [config.cosmos.partitionKey] }
    });
    container = cont;

    isMock = false;
    console.log(`✅ [Cosmos DB] Connected successfully to DB: "${config.cosmos.databaseId}", Container: "${config.cosmos.containerId}"`);
  } catch (error) {
    console.error('❌ [Cosmos DB] Failed to initialize Cosmos DB client:', error.message);
    console.warn('⚠️  [Cosmos DB] Falling back to MOCK in-memory mode.');
    isMock = true;
  }
}

export async function savePolicy(policy) {
  if (isMock) {
    inMemoryStore.unshift(policy);
    return { ...policy, _mock: true };
  }

  const { resource } = await container.items.create(policy);
  return resource;
}

export async function getPolicies(limit = 50) {
  if (isMock) {
    return inMemoryStore.slice(0, limit);
  }

  const querySpec = {
    query: 'SELECT * FROM c ORDER BY c._ts DESC OFFSET 0 LIMIT @limit',
    parameters: [{ name: '@limit', value: limit }]
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

export function isCosmosMock() {
  return isMock;
}
