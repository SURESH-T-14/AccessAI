#!/usr/bin/env node

/**
 * Firebase Configuration Validator
 * Run this to verify your Firebase setup is correct
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔍 Firebase Configuration Validator\n');

// Check 1: .env.local exists
console.log('📋 Check 1: .env.local file');
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local found\n');
} else {
  console.log('❌ .env.local NOT FOUND\n');
  console.log('   Create file: .env.local in root directory\n');
  process.exit(1);
}

// Check 2: Required environment variables
console.log('📋 Check 2: Required Environment Variables');
const envContent = fs.readFileSync(envPath, 'utf-8');
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

let missingVars = [];
let emptyVars = [];

requiredVars.forEach(varName => {
  const regex = new RegExp(`^${varName}=(.*)$`, 'm');
  const match = envContent.match(regex);
  
  if (!match) {
    missingVars.push(varName);
  } else if (!match[1] || match[1].trim() === '') {
    emptyVars.push(varName);
  } else {
    console.log(`✅ ${varName} = ${match[1].substring(0, 20)}...`);
  }
});

if (missingVars.length > 0) {
  console.log(`\n❌ Missing variables:\n   ${missingVars.join('\n   ')}\n`);
}

if (emptyVars.length > 0) {
  console.log(`\n❌ Empty variables:\n   ${emptyVars.join('\n   ')}\n`);
}

if (missingVars.length === 0 && emptyVars.length === 0) {
  console.log('\n✅ All required variables present and filled\n');
} else {
  console.log('\n⚠️  Please add/fill the missing variables in .env.local\n');
  process.exit(1);
}

// Check 3: Firebase configuration validity
console.log('📋 Check 3: Firebase Configuration Format');
const apiKeyMatch = envContent.match(/^VITE_FIREBASE_API_KEY=(.+)$/m);
const projectIdMatch = envContent.match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/m);
const authDomainMatch = envContent.match(/^VITE_FIREBASE_AUTH_DOMAIN=(.+)$/m);

if (apiKeyMatch && apiKeyMatch[1].length > 20) {
  console.log('✅ API Key looks valid');
} else {
  console.log('⚠️  API Key seems too short');
}

if (projectIdMatch && projectIdMatch[1].length > 3) {
  console.log('✅ Project ID looks valid');
} else {
  console.log('⚠️  Project ID seems too short');
}

if (authDomainMatch && authDomainMatch[1].includes('firebaseapp.com')) {
  console.log('✅ Auth Domain looks valid');
} else {
  console.log('⚠️  Auth Domain should include "firebaseapp.com"');
}

// Check 4: Firebase JSON config file
console.log('\n📋 Check 4: Firebase Service Account (Optional)');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
  console.log('✅ serviceAccountKey.json found (for backend use)');
} else {
  console.log('ℹ️  serviceAccountKey.json not found (optional for frontend)');
}

// Check 5: App component exists
console.log('\n📋 Check 5: React Components');
const appPath = path.join(__dirname, 'src', 'App.jsx');
const loginPath = path.join(__dirname, 'src', 'components', 'Login.jsx');

if (fs.existsSync(appPath)) {
  console.log('✅ App.jsx found');
} else {
  console.log('❌ App.jsx NOT FOUND');
}

if (fs.existsSync(loginPath)) {
  console.log('✅ Login.jsx found');
} else {
  console.log('❌ Login.jsx NOT FOUND');
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ Configuration Check Complete!\n');

console.log('Next Steps:');
console.log('1. Verify all variables are correct in .env.local');
console.log('2. Enable authentication methods in Firebase Console:');
console.log('   - Google Sign-In');
console.log('   - Email/Password');
console.log('   - Phone Authentication');
console.log('3. Run: npm run dev');
console.log('4. Test authentication at http://localhost:5174\n');

console.log('📚 See FIREBASE_SETUP.md for detailed configuration\n');
