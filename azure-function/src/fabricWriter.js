import { ClientSecretCredential } from '@azure/identity';
import { DataLakeServiceClient } from '@azure/storage-file-datalake';

export async function writePolicyToFabricBronze(policy) {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const workspaceName = process.env.FABRIC_WORKSPACE_NAME || 'ws-underwriting-analytics';
  const lakehouseName = process.env.FABRIC_LAKEHOUSE_NAME || 'lh_underwriting_bronze';

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Fabric credentials: AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET in environment.');
  }

  // 1. Authenticate to Fabric OneLake via Microsoft Entra ID
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const oneLakeEndpoint = 'https://onelake.dfs.fabric.microsoft.com';
  const serviceClient = new DataLakeServiceClient(oneLakeEndpoint, credential);

  // 2. Target Workspace filesystem
  const fileSystemClient = serviceClient.getFileSystemClient(workspaceName);

  // 3. Extract Partition Date Hierarchy
  const submissionDate = policy.submissionDate ? new Date(policy.submissionDate) : new Date();
  const year = policy.submissionYear || submissionDate.getUTCFullYear();
  const month = String(policy.submissionMonth || (submissionDate.getUTCMonth() + 1)).padStart(2, '0');
  const day = String(policy.submissionDay || submissionDate.getUTCDate()).padStart(2, '0');
  const policyId = policy.id || policy.policyId || `POL-${Date.now()}`;

  // 4. Construct Bronze Hierarchical Path:
  // e.g. lh_underwriting_bronze.Lakehouse/Files/bronze/policies/year=2026/month=10/day=19/POL-xxx.json
  const relativeFilePath = `${lakehouseName}.Lakehouse/Files/bronze/policies/year=${year}/month=${month}/day=${day}/${policyId}.json`;

  const fileClient = fileSystemClient.getFileClient(relativeFilePath);

  // 5. Serialize JSON payload
  const content = JSON.stringify(policy, null, 2);
  const buffer = Buffer.from(content, 'utf-8');

  // 6. Write to Fabric Bronze OneLake
  await fileClient.create();
  await fileClient.append(buffer, 0, buffer.length);
  await fileClient.flush(buffer.length);

  console.log(`✅ [Fabric Bronze] Successfully landed JSON at OneLake path:`);
  console.log(`   ${workspaceName}/${relativeFilePath}`);

  return {
    success: true,
    workspace: workspaceName,
    lakehouse: lakehouseName,
    partition: `year=${year}/month=${month}/day=${day}`,
    filePath: relativeFilePath,
    fullPath: `${oneLakeEndpoint}/${workspaceName}/${relativeFilePath}`
  };
}
