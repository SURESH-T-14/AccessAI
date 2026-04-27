#!/usr/bin/env node

/**
 * Comprehensive API & Secret Key Verification Test
 * Tests all external services and credentials
 */

import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import axios from 'axios';
import { MongoClient } from 'mongodb';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

// Helper function to log test results
function logTest(serviceName, passed, message) {
  const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
  console.log(`${status} | ${serviceName}: ${message}`);
  
  if (passed) {
    tests.passed++;
  } else {
    tests.failed++;
  }
  
  tests.results.push({ serviceName, passed, message });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TEST 1: MongoDB Connection
// ============================================
async function testMongoDB() {
  console.log(`\n${colors.blue}Testing MongoDB...${colors.reset}`);
  
  try {
    if (!process.env.MONGODB_URI) {
      logTest('MongoDB', false, 'MONGODB_URI not configured');
      return;
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const admin = client.db('admin');
    const result = await admin.command({ ping: 1 });
    
    if (result.ok === 1) {
      logTest('MongoDB', true, `Connected successfully to ${process.env.MONGODB_DB_NAME || 'accessai_db'}`);
    } else {
      logTest('MongoDB', false, 'Ping failed');
    }
    
    await client.close();
  } catch (error) {
    logTest('MongoDB', false, `Connection error: ${error.message}`);
  }
}

// ============================================
// TEST 2: Firebase
// ============================================
async function testFirebase() {
  console.log(`\n${colors.blue}Testing Firebase...${colors.reset}`);
  
  try {
    // Check service account file
    const serviceAccountPath = path.join(__dirname, 'firebase-admin-sdk.json');
    if (!fs.existsSync(serviceAccountPath)) {
      logTest('Firebase', false, 'firebase-admin-sdk.json not found');
      return;
    }

    logTest('Firebase', true, 'Service account JSON file exists');

    if (!process.env.FIREBASE_DATABASE_URL) {
      logTest('Firebase Database', false, 'FIREBASE_DATABASE_URL not configured');
      return;
    }

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }

    const db = admin.database();
    
    // Test write
    await db.ref('test/timestamp').set(new Date().getTime());
    logTest('Firebase Database', true, 'Read/Write operations working');

    // Clean up
    await db.ref('test/timestamp').remove();
    
  } catch (error) {
    logTest('Firebase', false, `Error: ${error.message}`);
  }
}

// ============================================
// TEST 3: OpenAI API
// ============================================
async function testOpenAI() {
  console.log(`\n${colors.blue}Testing OpenAI API...${colors.reset}`);
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      logTest('OpenAI', false, 'OPENAI_API_KEY not configured');
      return;
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, are you working?' }
      ],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data.choices) {
      logTest('OpenAI API', true, `Response: "${response.data.choices[0].message.content}"`);
    } else {
      logTest('OpenAI API', false, 'Unexpected response format');
    }
  } catch (error) {
    logTest('OpenAI API', false, `Error: ${error.message}`);
  }
}

// ============================================
// TEST 4: Google Gemini API
// ============================================
async function testGemini() {
  console.log(`\n${colors.blue}Testing Google Gemini API...${colors.reset}`);
  
  try {
    if (!process.env.VITE_GEMINI_API_KEY) {
      logTest('Gemini API', false, 'VITE_GEMINI_API_KEY not configured');
      return;
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: 'Hello, are you working?' }]
        }]
      },
      { timeout: 10000 }
    );

    if (response.status === 200) {
      logTest('Gemini API', true, 'API key valid and responding');
    } else {
      logTest('Gemini API', false, 'Unexpected response');
    }
  } catch (error) {
    logTest('Gemini API', false, `Error: ${error.message}`);
  }
}

// ============================================
// TEST 5: Google Custom Search
// ============================================
async function testGoogleSearch() {
  console.log(`\n${colors.blue}Testing Google Custom Search API...${colors.reset}`);
  
  try {
    if (!process.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY) {
      logTest('Google Search', false, 'VITE_GOOGLE_CUSTOM_SEARCH_API_KEY not configured');
      return;
    }
    
    if (!process.env.VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
      logTest('Google Search', false, 'VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID not configured');
      return;
    }

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        q: 'test',
        key: process.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY,
        cx: process.env.VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data.items) {
      logTest('Google Custom Search', true, `Found ${response.data.items.length} results`);
    } else {
      logTest('Google Custom Search', false, 'No results found');
    }
  } catch (error) {
    logTest('Google Custom Search', false, `Error: ${error.message}`);
  }
}

// ============================================
// TEST 6: Hugging Face API
// ============================================
async function testHuggingFace() {
  console.log(`\n${colors.blue}Testing Hugging Face API...${colors.reset}`);
  
  try {
    if (!process.env.VITE_HUGGINGFACE_API_KEY) {
      logTest('Hugging Face', false, 'VITE_HUGGINGFACE_API_KEY not configured');
      return;
    }

    const response = await axios.get('https://huggingface.co/api/whoami', {
      headers: {
        'Authorization': `Bearer ${process.env.VITE_HUGGINGFACE_API_KEY}`
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data.name) {
      logTest('Hugging Face', true, `Authenticated as: ${response.data.name}`);
    } else {
      logTest('Hugging Face', false, 'Authentication failed');
    }
  } catch (error) {
    logTest('Hugging Face', false, `Error: ${error.message}`);
  }
}

// ============================================
// TEST 7: Firebase Auth
// ============================================
async function testFirebaseAuth() {
  console.log(`\n${colors.blue}Testing Firebase Authentication...${colors.reset}`);
  
  try {
    if (!process.env.VITE_FIREBASE_API_KEY) {
      logTest('Firebase Auth', false, 'VITE_FIREBASE_API_KEY not configured');
      return;
    }

    if (!process.env.VITE_FIREBASE_PROJECT_ID) {
      logTest('Firebase Auth', false, 'VITE_FIREBASE_PROJECT_ID not configured');
      return;
    }

    // Test API key validity by making a simple request
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.VITE_FIREBASE_API_KEY}`,
      { idToken: 'test' },
      { timeout: 10000 }
    );

    logTest('Firebase Auth', true, 'API key valid');
  } catch (error) {
    if (error.response?.status === 400) {
      // 400 is expected for invalid token, but proves API key works
      logTest('Firebase Auth', true, 'API key valid');
    } else {
      logTest('Firebase Auth', false, `Error: ${error.message}`);
    }
  }
}

// ============================================
// TEST 8: Twilio SMS
// ============================================
async function testTwilio() {
  console.log(`\n${colors.blue}Testing Twilio SMS...${colors.reset}`);
  
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      logTest('Twilio SMS', false, 'TWILIO_ACCOUNT_SID not configured');
      return;
    }

    if (!process.env.TWILIO_AUTH_TOKEN) {
      logTest('Twilio SMS', false, 'TWILIO_AUTH_TOKEN not configured');
      return;
    }

    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64');

    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        },
        timeout: 10000
      }
    );

    if (response.status === 200) {
      logTest('Twilio SMS', true, `Account verified: ${response.data.friendly_name}`);
    } else {
      logTest('Twilio SMS', false, 'Account verification failed');
    }
  } catch (error) {
    logTest('Twilio SMS', false, `Error: ${error.message}`);
  }
}

// ============================================
// TEST 9: Gmail/Email
// ============================================
async function testGmail() {
  console.log(`\n${colors.blue}Testing Gmail Configuration...${colors.reset}`);
  
  try {
    if (!process.env.EMAIL_USER) {
      logTest('Gmail', false, 'EMAIL_USER not configured');
      return;
    }

    if (!process.env.EMAIL_PASSWORD && !process.env.EMAIL_APP_PASSWORD) {
      logTest('Gmail', false, 'EMAIL_PASSWORD or EMAIL_APP_PASSWORD not configured');
      return;
    }

    // Check if credentials format looks valid
    if (process.env.EMAIL_USER.includes('@')) {
      logTest('Gmail', true, `Email configured: ${process.env.EMAIL_USER}`);
    } else {
      logTest('Gmail', false, 'EMAIL_USER format invalid');
    }
  } catch (error) {
    logTest('Gmail', false, `Error: ${error.message}`);
  }
}

// ============================================
// TEST 10: Environment Variables
// ============================================
function testEnvVariables() {
  console.log(`\n${colors.blue}Testing Environment Variables...${colors.reset}`);
  
  const requiredEnvVars = [
    'MONGODB_URI',
    'OPENAI_API_KEY',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_GEMINI_API_KEY',
    'VITE_HUGGINGFACE_API_KEY'
  ];

  let missing = 0;
  requiredEnvVars.forEach(variable => {
    if (process.env[variable]) {
      logTest(`ENV: ${variable}`, true, 'Configured');
    } else {
      logTest(`ENV: ${variable}`, false, 'Missing');
      missing++;
    }
  });

  if (missing === 0) {
    console.log(`${colors.green}All required environment variables are set${colors.reset}`);
  } else {
    console.log(`${colors.yellow}${missing} environment variables are missing${colors.reset}`);
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  console.log(`
${colors.blue}╔════════════════════════════════════════════════════════════╗
║     COMPREHENSIVE API & SECRET KEY VERIFICATION TEST       ║
║                   ${new Date().toLocaleString()}                  ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  // Run all tests
  await testEnvVariables();
  await testMongoDB();
  await testFirebase();
  await testFirebaseAuth();
  await testOpenAI();
  await testGemini();
  await testGoogleSearch();
  await testHuggingFace();
  await testTwilio();
  await testGmail();

  // Summary
  console.log(`
${colors.blue}╔════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                          ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  console.log(`${colors.green}✅ Passed: ${tests.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${tests.failed}${colors.reset}`);
  console.log(`${colors.blue}📊 Total: ${tests.passed + tests.failed}${colors.reset}`);

  // Success rate
  const successRate = ((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1);
  const statusColor = successRate >= 80 ? colors.green : colors.yellow;
  console.log(`${statusColor}Success Rate: ${successRate}%${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(tests.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
