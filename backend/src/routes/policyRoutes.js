import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { savePolicy, getPolicies, isCosmosMock } from '../services/cosmosService.js';
import { sendPolicyMessage, isServiceBusMock } from '../services/serviceBusService.js';

const router = express.Router();

// Generate clean human-readable Policy ID: POL-YYYYMMDD-XXXX
function generatePolicyId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `POL-${dateStr}-${randomSuffix}`;
}

// GET /api/policies - List recent policy submissions
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const policies = await getPolicies(limit);
    res.json({
      success: true,
      count: policies.length,
      data: policies
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/policies - Submit new policy
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Basic validation
    if (!body.insured?.businessName) {
      return res.status(400).json({ success: false, error: 'Insured business name is required.' });
    }
    if (!body.coverage?.policyType) {
      return res.status(400).json({ success: false, error: 'Coverage policy type is required.' });
    }

    const now = new Date();
    const policyId = body.policyId || generatePolicyId();

    // Construct enriched policy document
    const policyDocument = {
      id: policyId,
      policyId: policyId,
      submissionDate: now.toISOString(),
      submissionYear: now.getUTCFullYear(),
      submissionMonth: String(now.getUTCMonth() + 1).padStart(2, '0'),
      submissionDay: String(now.getUTCDate()).padStart(2, '0'),
      underwriter: {
        id: body.underwriter?.id || 'UW-DEFAULT',
        name: body.underwriter?.name || 'Staff Underwriter',
        notes: body.underwriter?.notes || ''
      },
      insured: {
        businessName: body.insured.businessName,
        taxId: body.insured.taxId || 'N/A',
        industry: body.insured.industry || 'General Commercial',
        annualRevenue: Number(body.insured.annualRevenue) || 0,
        employeeCount: Number(body.insured.employeeCount) || 1,
        address: {
          street: body.insured.address?.street || '',
          city: body.insured.address?.city || '',
          state: body.insured.address?.state || '',
          zipCode: body.insured.address?.zipCode || '',
          country: body.insured.address?.country || 'USA'
        }
      },
      coverage: {
        policyType: body.coverage.policyType, // Partition key in Cosmos DB
        effectiveDate: body.coverage.effectiveDate || now.toISOString().slice(0, 10),
        expirationDate: body.coverage.expirationDate || '',
        coverageLimit: Number(body.coverage.coverageLimit) || 1000000,
        deductible: Number(body.coverage.deductible) || 10000,
        quotedPremium: Number(body.coverage.quotedPremium) || 5000
      },
      riskAssessment: {
        riskScore: Number(body.riskAssessment?.riskScore) || 50,
        riskTier: body.riskAssessment?.riskTier || 'Standard',
        approvalStatus: body.riskAssessment?.approvalStatus || 'Submitted',
        riskFactors: Array.isArray(body.riskAssessment?.riskFactors) 
          ? body.riskAssessment.riskFactors 
          : []
      },
      metadata: {
        createdAt: now.toISOString(),
        source: 'underwriter-portal-react',
        version: '1.0'
      }
    };

    // 1. Save to Azure Cosmos DB
    const savedDoc = await savePolicy(policyDocument);

    // 2. Publish event to Azure Service Bus Queue
    const serviceBusResult = await sendPolicyMessage(policyDocument);

    res.status(201).json({
      success: true,
      message: 'Policy successfully submitted to Cosmos DB and dispatched to Service Bus.',
      policyId: policyDocument.id,
      cosmosMode: isCosmosMock() ? 'mock' : 'live_cosmos_db',
      serviceBusMode: isServiceBusMock() ? 'mock' : 'live_service_bus',
      data: savedDoc,
      serviceBus: serviceBusResult
    });
  } catch (error) {
    console.error('Error submitting policy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/policies/status - Status check of cloud connections
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    connections: {
      cosmosDb: isCosmosMock() ? 'MOCK_IN_MEMORY' : 'CONNECTED_TO_AZURE',
      serviceBus: isServiceBusMock() ? 'MOCK_SIMULATED' : 'CONNECTED_TO_AZURE'
    }
  });
});

export default router;
