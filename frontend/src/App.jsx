import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Send, 
  RefreshCw, 
  Database, 
  Cpu, 
  Layers, 
  CheckCircle, 
  AlertCircle,
  FileText,
  DollarSign,
  Activity,
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';

const POLICY_TYPES = [
  'Commercial General Liability',
  'Cyber & Data Risk',
  'Commercial Property',
  'Directors & Officers (D&O)',
  'Workers Compensation',
  'Professional Liability (E&O)'
];

const INDUSTRIES = [
  'Information Technology & SaaS',
  'Healthcare & Biotechnology',
  'Financial Services & Fintech',
  'Commercial Construction',
  'Manufacturing & Logistics',
  'Retail & E-Commerce'
];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ cosmosDb: 'CHECKING...', serviceBus: 'CHECKING...' });
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    underwriter: {
      id: 'UW-8821',
      name: 'Sarah Jenkins',
      notes: 'Clean loss history. Strong cybersecurity protocols in place.'
    },
    insured: {
      businessName: 'Apex Cloud Solutions Inc.',
      taxId: '12-9874563',
      industry: 'Information Technology & SaaS',
      annualRevenue: 15000000,
      employeeCount: 65,
      address: {
        street: '100 Innovation Way',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        country: 'USA'
      }
    },
    coverage: {
      policyType: 'Cyber & Data Risk',
      effectiveDate: new Date().toISOString().slice(0, 10),
      expirationDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().slice(0, 10),
      coverageLimit: 5000000,
      deductible: 50000,
      quotedPremium: 28500
    },
    riskAssessment: {
      riskScore: 32,
      riskTier: 'Low Risk',
      approvalStatus: 'Approved',
      riskFactors: ['Cloud data residency in US', 'MFA enforced across all endpoints']
    }
  });

  // Calculate Risk Tier dynamically based on slider
  const handleRiskScoreChange = (score) => {
    let tier = 'Low Risk';
    if (score > 70) tier = 'High Hazard';
    else if (score > 40) tier = 'Standard Risk';

    setFormData(prev => ({
      ...prev,
      riskAssessment: {
        ...prev.riskAssessment,
        riskScore: score,
        riskTier: tier
      }
    }));
  };

  // Fetch status and policies
  const fetchData = async () => {
    try {
      const statusRes = await fetch('/api/policies/status');
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setStatus(statusJson.connections);
        
        const listRes = await fetch('/api/policies?limit=20');
        if (listRes.ok) {
          const listJson = await listRes.json();
          setPolicies(listJson.data || []);
          if (listJson.data?.length > 0 && !selectedPolicy) {
            setSelectedPolicy(listJson.data[0]);
          }
        }
      } else {
        throw new Error('API offline');
      }
    } catch {
      // Running standalone in hosted web demo mode
      setStatus({ cosmosDb: 'DEMO_STANDALONE', serviceBus: 'SIMULATED' });
      if (policies.length === 0) {
        const initialDemoPolicy = {
          id: 'POL-20261019-DEMO',
          policyId: 'POL-20261019-DEMO',
          submissionDate: new Date().toISOString(),
          submissionYear: 2026,
          submissionMonth: '10',
          submissionDay: '19',
          underwriter: formData.underwriter,
          insured: formData.insured,
          coverage: formData.coverage,
          riskAssessment: formData.riskAssessment,
          metadata: { source: 'underwriter-portal-demo', mode: 'web-showcase' }
        };
        setPolicies([initialDemoPolicy]);
        setSelectedPolicy(initialDemoPolicy);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLastSubmissionResult(null);

    const now = new Date();
    const generatedId = `POL-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newPolicyDoc = {
      id: generatedId,
      policyId: generatedId,
      submissionDate: now.toISOString(),
      submissionYear: now.getUTCFullYear(),
      submissionMonth: String(now.getUTCMonth() + 1).padStart(2, '0'),
      submissionDay: String(now.getUTCDate()).padStart(2, '0'),
      underwriter: formData.underwriter,
      insured: formData.insured,
      coverage: formData.coverage,
      riskAssessment: formData.riskAssessment,
      metadata: { createdAt: now.toISOString(), source: 'underwriter-portal-web' }
    };

    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const result = await res.json();
        setLastSubmissionResult({
          type: 'success',
          message: `Policy ${result.policyId} submitted successfully! Recorded in Cosmos DB and dispatched to Service Bus.`,
          data: result
        });
        setSelectedPolicy(result.data);
        fetchData();
        return;
      }
      throw new Error('API unreachable');
    } catch {
      // Standalone Web Demo Mode behavior
      setTimeout(() => {
        setPolicies(prev => [newPolicyDoc, ...prev]);
        setSelectedPolicy(newPolicyDoc);
        setLastSubmissionResult({
          type: 'success',
          message: `[Demo Mode] Policy ${generatedId} recorded! Simulating Service Bus dispatch & Fabric Bronze landing.`
        });
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Top Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="brand-title">Atomx Underwriting Portal</h1>
            <p className="brand-subtitle">Real-time Policy Ingestion &bull; Cosmos DB &bull; Azure Service Bus &bull; Fabric Bronze Lakehouse</p>
          </div>
        </div>

        <button onClick={fetchData} className="btn btn-secondary" title="Refresh status">
          <RefreshCw size={15} /> Refresh Pipeline
        </button>
      </header>

      {/* Cloud Pipeline Status Bar */}
      <div className="pipeline-banner">
        <div className="pipeline-step active">
          <FileText size={18} color="#38bdf8" />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>1. React Frontend</div>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Port 3000</div>
          </div>
        </div>
        <div className="pipeline-arrow">&rarr;</div>

        <div className="pipeline-step active">
          <Cpu size={18} color="#a855f7" />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>2. Node.js API</div>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Port 5050 (Express)</div>
          </div>
        </div>
        <div className="pipeline-arrow">&rarr;</div>

        <div className="pipeline-step">
          <Database size={18} color="#3b82f6" />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>3. Cosmos DB</div>
            <span className={`pipeline-step-badge ${status.cosmosDb === 'CONNECTED_TO_AZURE' ? 'badge-connected' : 'badge-mock'}`}>
              {status.cosmosDb || 'CHECKING'}
            </span>
          </div>
        </div>
        <div className="pipeline-arrow">&rarr;</div>

        <div className="pipeline-step">
          <Activity size={18} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>4. Azure Service Bus</div>
            <span className={`pipeline-step-badge ${status.serviceBus === 'CONNECTED_TO_AZURE' ? 'badge-connected' : 'badge-mock'}`}>
              {status.serviceBus || 'CHECKING'}
            </span>
          </div>
        </div>
        <div className="pipeline-arrow">&rarr;</div>

        <div className="pipeline-step">
          <Layers size={18} color="#10b981" />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>5. Fabric Bronze Lakehouse</div>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>year/month/day/*.json</div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {lastSubmissionResult && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: lastSubmissionResult.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${lastSubmissionResult.type === 'success' ? '#10b981' : '#f43f5e'}`
        }}>
          {lastSubmissionResult.type === 'success' ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <AlertCircle size={20} color="#f43f5e" />
          )}
          <span style={{ fontSize: '0.875rem' }}>{lastSubmissionResult.message}</span>
        </div>
      )}

      {/* Main Grid: Form on Left, Lakehouse JSON & Live Submissions on Right */}
      <div className="main-grid">
        
        {/* Left Column: Underwriter Policy Submission Form */}
        <div className="card">
          <h2 className="card-title">
            <Building size={20} color="#38bdf8" /> Policy Underwriting Intake Form
          </h2>
          <p className="card-desc">Enter policy coverage terms and risk assessment. Submissions write to Cosmos DB and trigger the event pipeline.</p>

          <form onSubmit={handleSubmit}>
            {/* 1. Insured Details */}
            <div className="form-section">
              <div className="form-section-header">
                <Building size={15} /> 1. Insured Organization
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Business / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.insured.businessName}
                    onChange={(e) => setFormData({
                      ...formData,
                      insured: { ...formData.insured, businessName: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Tax ID / EIN</label>
                  <input
                    type="text"
                    value={formData.insured.taxId}
                    onChange={(e) => setFormData({
                      ...formData,
                      insured: { ...formData.insured, taxId: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="form-row three-col">
                <div className="form-group">
                  <label>Industry</label>
                  <select
                    value={formData.insured.industry}
                    onChange={(e) => setFormData({
                      ...formData,
                      insured: { ...formData.insured, industry: e.target.value }
                    })}
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Annual Revenue ($)</label>
                  <input
                    type="number"
                    value={formData.insured.annualRevenue}
                    onChange={(e) => setFormData({
                      ...formData,
                      insured: { ...formData.insured, annualRevenue: Number(e.target.value) }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Employees</label>
                  <input
                    type="number"
                    value={formData.insured.employeeCount}
                    onChange={(e) => setFormData({
                      ...formData,
                      insured: { ...formData.insured, employeeCount: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="form-row three-col">
                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={formData.insured.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      insured: {
                        ...formData.insured,
                        address: { ...formData.insured.address, street: e.target.value }
                      }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>City & State</label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={`${formData.insured.address.city}, ${formData.insured.address.state}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(',');
                      setFormData({
                        ...formData,
                        insured: {
                          ...formData.insured,
                          address: { 
                            ...formData.insured.address, 
                            city: parts[0]?.trim() || '', 
                            state: parts[1]?.trim() || '' 
                          }
                        }
                      });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={formData.insured.address.zipCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      insured: {
                        ...formData.insured,
                        address: { ...formData.insured.address, zipCode: e.target.value }
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* 2. Policy & Coverage Terms */}
            <div className="form-section">
              <div className="form-section-header">
                <DollarSign size={15} /> 2. Coverage & Financial Terms
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Policy Line / Type (Cosmos Partition Key) *</label>
                  <select
                    value={formData.coverage.policyType}
                    onChange={(e) => setFormData({
                      ...formData,
                      coverage: { ...formData.coverage, policyType: e.target.value }
                    })}
                  >
                    {POLICY_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quoted Premium ($ / year) *</label>
                  <input
                    type="number"
                    required
                    value={formData.coverage.quotedPremium}
                    onChange={(e) => setFormData({
                      ...formData,
                      coverage: { ...formData.coverage, quotedPremium: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Coverage Limit ($)</label>
                  <input
                    type="number"
                    value={formData.coverage.coverageLimit}
                    onChange={(e) => setFormData({
                      ...formData,
                      coverage: { ...formData.coverage, coverageLimit: Number(e.target.value) }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Deductible ($)</label>
                  <input
                    type="number"
                    value={formData.coverage.deductible}
                    onChange={(e) => setFormData({
                      ...formData,
                      coverage: { ...formData.coverage, deductible: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Effective Date</label>
                  <input
                    type="date"
                    value={formData.coverage.effectiveDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      coverage: { ...formData.coverage, effectiveDate: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    value={formData.coverage.expirationDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      coverage: { ...formData.coverage, expirationDate: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* 3. Underwriter Assessment */}
            <div className="form-section">
              <div className="form-section-header">
                <UserCheck size={15} /> 3. Underwriter Risk Evaluation
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label>Risk Score Index (1 - 100):</label>
                  <span className={`badge ${
                    formData.riskAssessment.riskScore > 70 ? 'badge-amber' : 'badge-green'
                  }`}>
                    {formData.riskAssessment.riskTier} ({formData.riskAssessment.riskScore}/100)
                  </span>
                </div>
                <div className="risk-slider-container">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    className="risk-slider"
                    value={formData.riskAssessment.riskScore}
                    onChange={(e) => handleRiskScoreChange(Number(e.target.value))}
                  />
                  <span className="risk-score-display">{formData.riskAssessment.riskScore}</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Underwriter Decision</label>
                  <select
                    value={formData.riskAssessment.approvalStatus}
                    onChange={(e) => setFormData({
                      ...formData,
                      riskAssessment: { ...formData.riskAssessment, approvalStatus: e.target.value }
                    })}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Underwriter Name</label>
                  <input
                    type="text"
                    value={formData.underwriter.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      underwriter: { ...formData.underwriter, name: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Underwriting Notes</label>
                <textarea
                  rows="2"
                  value={formData.underwriter.notes}
                  onChange={(e) => setFormData({
                    ...formData,
                    underwriter: { ...formData.underwriter, notes: e.target.value }
                  })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Send size={18} /> {loading ? 'Submitting to Cloud Pipeline...' : 'Submit Policy to Real-time Pipeline'}
            </button>
          </form>
        </div>

        {/* Right Column: Ingestion Lakehouse Inspector & History */}
        <div>
          {/* Bronze Lakehouse JSON Landing Inspector */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="card-title">
              <Layers size={20} color="#10b981" /> Bronze Lakehouse Target JSON
            </h2>
            <p className="card-desc">
              Exact payload arriving in Microsoft Fabric OneLake at path: <br />
              <code style={{ color: '#38bdf8' }}>
                Files/bronze/policies/{selectedPolicy?.submissionYear || 'YYYY'}/{selectedPolicy?.submissionMonth || 'MM'}/{selectedPolicy?.submissionDay || 'DD'}/{selectedPolicy?.id || 'policy-id'}.json
              </code>
            </p>

            <pre className="code-block">
              {selectedPolicy 
                ? JSON.stringify(selectedPolicy, null, 2) 
                : '// Submit a policy or select from history below to inspect raw JSON payload'}
            </pre>
          </div>

          {/* Submissions History Table */}
          <div className="card">
            <h2 className="card-title">
              <Activity size={20} color="#f59e0b" /> Ingestion Activity Stream
            </h2>
            <p className="card-desc">Recent policies recorded in Cosmos DB and queued on Service Bus.</p>

            {policies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6b7280' }}>
                No policies submitted yet. Fill out the form to trigger the first ingestion!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Policy ID</th>
                      <th>Insured</th>
                      <th>Coverage</th>
                      <th>Premium</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => (
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedPolicy(p)}
                        style={{ 
                          cursor: 'pointer',
                          background: selectedPolicy?.id === p.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                        }}
                      >
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                          {p.id}
                        </td>
                        <td>{p.insured?.businessName}</td>
                        <td>
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                            {p.coverage?.policyType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          ${p.coverage?.quotedPremium?.toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${
                            p.riskAssessment?.approvalStatus === 'Approved' ? 'badge-green' : 'badge-amber'
                          }`}>
                            {p.riskAssessment?.approvalStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
