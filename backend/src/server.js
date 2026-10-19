import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeCosmos } from './services/cosmosService.js';
import { initializeServiceBus } from './services/serviceBusService.js';
import policyRoutes from './routes/policyRoutes.js';

const app = express();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/policies', policyRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server and initialize cloud connectors
async function startServer() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting Underwriter Portal Backend API Server...');
  console.log('----------------------------------------------------');

  // Attempt to connect to Azure services (falls back to mock if keys missing)
  await initializeCosmos();
  await initializeServiceBus();

  app.listen(config.port, () => {
    console.log(`📡 Server running at: http://localhost:${config.port}`);
    console.log(`📋 API Health:       http://localhost:${config.port}/api/health`);
    console.log(`📊 Cloud Status:     http://localhost:${config.port}/api/policies/status`);
    console.log('----------------------------------------------------');
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});
