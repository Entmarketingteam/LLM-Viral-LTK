#!/usr/bin/env tsx
/**
 * Test API Endpoints
 * 
 * Tests all V2 API endpoints with mock data
 * 
 * Usage:
 *   npm run dev  # Start server first
 *   npx tsx scripts/test-api.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MOCK_DATA_DIR = path.join(process.cwd(), 'data', 'mock');

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  response?: unknown;
}

const results: TestResult[] = [];

/**
 * Make API request
 */
async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  description?: string
): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🧪 Testing: ${method} ${endpoint}`);
  if (description) console.log(`   ${description}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, you'd need Clerk auth token
        // 'Authorization': 'Bearer <token>'
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json().catch(() => ({ error: 'No JSON response' }));
    
    const result: TestResult = {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      response: data,
    };
    
    if (response.ok) {
      console.log(`   ✅ ${response.status} - Success`);
    } else {
      console.log(`   ❌ ${response.status} - ${data.error || data.message || 'Error'}`);
      result.error = data.error || data.message || 'Unknown error';
    }
    
    return result;
  } catch (error) {
    const result: TestResult = {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    console.log(`   ❌ Failed - ${result.error}`);
    return result;
  }
}

/**
 * Load mock data
 */
function loadMockData() {
  const creativesPath = path.join(MOCK_DATA_DIR, 'creatives.json');
  const metricsPath = path.join(MOCK_DATA_DIR, 'metrics.json');
  
  if (!fs.existsSync(creativesPath)) {
    console.error('❌ Mock data not found. Run: npx tsx scripts/generate-mock-data.ts');
    process.exit(1);
  }
  
  return {
    creatives: JSON.parse(fs.readFileSync(creativesPath, 'utf-8')),
    metrics: JSON.parse(fs.readFileSync(metricsPath, 'utf-8')),
  };
}

/**
 * Test Ingestion API
 */
async function testIngestion(mockData: { creatives: unknown[]; metrics: unknown[] }) {
  console.log('\n📥 Testing Ingestion API...');
  
  // Test POST /v1/ingestion/creative
  const creative = mockData.creatives[0];
  results.push(await testEndpoint(
    '/api/v1/ingestion/creative',
    'POST',
    creative,
    'Register a creative'
  ));
  
  // Test POST /v1/ingestion/metrics
  const metrics = mockData.metrics
    .filter((m: { creative_id: string }) => m.creative_id === (creative as { creative_id: string }).creative_id)
    .slice(0, 7);
  
  results.push(await testEndpoint(
    '/api/v1/ingestion/metrics',
    'POST',
    { rows: metrics },
    'Ingest daily metrics'
  ));
  
  // Test GET /v1/ingestion/creative
  results.push(await testEndpoint(
    '/api/v1/ingestion/creative?limit=5',
    'GET',
    undefined,
    'List recent creatives'
  ));
}

/**
 * Test Data API
 */
async function testDataAPI() {
  console.log('\n📊 Testing Data API...');
  
  // Test GET /v1/creatives/top
  results.push(await testEndpoint(
    '/api/v1/creatives/top?niche=beauty&interval_days=30&limit=10',
    'GET',
    undefined,
    'Get top creatives by niche'
  ));
  
  // Test GET /v1/creatives/top with filters
  results.push(await testEndpoint(
    '/api/v1/creatives/top?niche=fashion&platform=ltk&source_type=organic&sort_by=engagement_rate',
    'GET',
    undefined,
    'Get top creatives with filters'
  ));
  
  // Test GET /v1/creatives/{id}
  results.push(await testEndpoint(
    '/api/v1/creatives/mock_creative_0001',
    'GET',
    undefined,
    'Get creative details'
  ));
  
  // Test GET /v1/creatives/{id}/similar
  results.push(await testEndpoint(
    '/api/v1/creatives/mock_creative_0001/similar?top_k=5',
    'GET',
    undefined,
    'Find similar creatives'
  ));
}

/**
 * Test Vector API
 */
async function testVectorAPI() {
  console.log('\n🔍 Testing Vector API...');
  
  // Generate a test vector
  const testVector = Array.from({ length: 512 }, () => Math.random() - 0.5);
  
  // Test POST /v1/vectors/query
  results.push(await testEndpoint(
    '/api/v1/vectors/query',
    'POST',
    {
      vector: testVector,
      top_k: 5,
      namespace: 'creatives',
    },
    'Query similar vectors'
  ));
  
  // Test POST /v1/vectors/upsert
  results.push(await testEndpoint(
    '/api/v1/vectors/upsert',
    'POST',
    {
      namespace: 'creatives',
      vectors: [
        {
          id: 'test_vector_001',
          values: testVector,
          metadata: {
            creative_id: 'test_creative_001',
            platform: 'ltk',
            niche: 'beauty',
          },
        },
      ],
    },
    'Upsert vectors'
  ));
}

/**
 * Main
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  API Endpoint Testing');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log('Note: These tests require the dev server to be running');
  console.log('      and may require authentication tokens\n');
  
  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/test`);
    if (!healthCheck.ok) {
      console.log('⚠️  Server may not be running or not responding correctly');
    }
  } catch {
    console.log('❌ Cannot connect to server. Make sure to run: npm run dev');
    process.exit(1);
  }
  
  // Load mock data
  const mockData = loadMockData();
  console.log(`\n📦 Loaded ${mockData.creatives.length} creatives, ${mockData.metrics.length} metrics`);
  
  // Run tests
  await testIngestion(mockData);
  await testDataAPI();
  await testVectorAPI();
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.method} ${r.endpoint} - ${r.error || r.status}`);
    });
  }
  
  // Save results
  const resultsPath = path.join(process.cwd(), 'data', 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}\n`);
}

main().catch(console.error);
