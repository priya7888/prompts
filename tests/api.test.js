/**
 * Simple Integration Test for Express API endpoints
 */
const http = require('http');

const API_HOST = 'localhost';
const API_PORT = process.env.PORT || 5001;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            raw: data
          });
        }
      });
    });

    req.on('error', (err) => { reject(err); });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('STARTING INTEGRATION TESTS FOR PROMPTOPS BACKEND API');
  console.log('----------------------------------------------------');
  
  try {
    // Test 1: Fetch Prompts
    console.log('Test 1: GET /api/prompts...');
    const res1 = await makeRequest('GET', '/api/prompts');
    if (res1.statusCode === 200 && Array.isArray(res1.data)) {
      console.log('✓ Success: Prompts list fetched. Count:', res1.data.length);
    } else {
      throw new Error(`Test 1 Failed: Status ${res1.statusCode}`);
    }

    // Test 2: Fetch Test Suites
    console.log('\nTest 2: GET /api/test-suites...');
    const res2 = await makeRequest('GET', '/api/test-suites');
    if (res2.statusCode === 200 && Array.isArray(res2.data)) {
      console.log('✓ Success: Test suites list fetched. Count:', res2.data.length);
    } else {
      throw new Error(`Test 2 Failed: Status ${res2.statusCode}`);
    }

    // Test 3: Fetch Dashboard Analytics
    console.log('\nTest 3: GET /api/analytics/dashboard...');
    const res3 = await makeRequest('GET', '/api/analytics/dashboard');
    if (res3.statusCode === 200 && res3.data.hasOwnProperty('avgScore')) {
      console.log('✓ Success: Analytics metrics generated. Avg Score:', res3.data.avgScore);
    } else {
      throw new Error(`Test 3 Failed: Status ${res3.statusCode}`);
    }

    console.log('\n----------------------------------------------------');
    console.log('ALL API SERVICE TESTS COMPLETED SUCCESSFULLY (3/3)');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('\n❌ Test execution failed!');
    console.error(err.message);
    console.error('Make sure the API server is running (npm run dev) on port 5000 before running tests.');
    process.exit(1);
  }
}

runTests();
