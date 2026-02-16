#!/usr/bin/env node
/**
 * Firebase to MongoDB Data Sync Script
 * Restores all Firebase data to MongoDB backup
 */

const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// MongoDB configuration
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME;

let db_firestore = null;
let db_mongo = null;
let mongoClient = null;

async function initializeFirebase() {
  try {
    // Check for service account key
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require('./firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      });
      console.log('[✓] Firebase initialized with service account key');
    } else {
      console.log('[!] Service account key not found');
      console.log('    You can download it from:');
      console.log('    Firebase Console > Project Settings > Service Accounts');
      console.log('    Place it as: firebase-service-account.json');
      return false;
    }
    
    db_firestore = admin.firestore();
    return true;
  } catch (error) {
    console.error('[!] Firebase initialization failed:', error.message);
    return false;
  }
}

async function connectMongoDB() {
  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db_mongo = mongoClient.db(mongoDbName);
    console.log('[✓] Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('[!] MongoDB connection failed:', error.message);
    return false;
  }
}

async function syncMessages() {
  if (!db_firestore || !db_mongo) return 0;
  
  try {
    console.log('[*] Syncing chat messages from Firebase...');
    
    const appId = 'access-ai-v4';
    const usersRef = db_firestore.collection('artifacts').doc(appId).collection('users');
    
    let totalSynced = 0;
    const usersSnapshot = await usersRef.get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`  [*] Processing user: ${userId}`);
      
      const chatsRef = userDoc.ref.collection('chats');
      const chatsSnapshot = await chatsRef.get();
      
      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;
        const messagesRef = chatDoc.ref.collection('messages');
        const messagesSnapshot = await messagesRef.get();
        
        for (const msgDoc of messagesSnapshot.docs) {
          const msgData = msgDoc.data();
          
          try {
            // Add metadata for tracking
            await db_mongo.collection('messages').updateOne(
              { firebaseId: msgDoc.id, userId },
              {
                $set: {
                  userId,
                  chatId,
                  firebaseId: msgDoc.id,
                  ...msgData,
                  syncedAt: new Date(),
                }
              },
              { upsert: true }
            );
            totalSynced++;
          } catch (error) {
            if (!error.message.includes('duplicate')) {
              console.error(`    [!] Error syncing message: ${error.message}`);
            }
          }
        }
      }
    }
    
    console.log(`[✓] Synced ${totalSynced} messages to MongoDB`);
    return totalSynced;
  } catch (error) {
    console.error('[!] Error syncing messages:', error);
    return 0;
  }
}

async function syncUserProfiles() {
  if (!db_firestore || !db_mongo) return 0;
  
  try {
    console.log('[*] Syncing user profiles from Firebase...');
    
    const appId = 'access-ai-v4';
    const usersRef = db_firestore.collection('artifacts').doc(appId).collection('users');
    
    let totalSynced = 0;
    const usersSnapshot = await usersRef.get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      try {
        await db_mongo.collection('users').updateOne(
          { uid: userId },
          {
            $set: {
              uid: userId,
              firebaseId: userDoc.id,
              ...userData,
              syncedAt: new Date(),
            }
          },
          { upsert: true }
        );
        totalSynced++;
      } catch (error) {
        console.error(`  [!] Error syncing user ${userId}: ${error.message}`);
      }
    }
    
    console.log(`[✓] Synced ${totalSynced} user profiles to MongoDB`);
    return totalSynced;
  } catch (error) {
    console.error('[!] Error syncing user profiles:', error);
    return 0;
  }
}

async function syncEmergencyContacts() {
  if (!db_firestore || !db_mongo) return 0;
  
  try {
    console.log('[*] Syncing emergency contacts from Firebase...');
    
    const appId = 'access-ai-v4';
    const usersRef = db_firestore.collection('artifacts').doc(appId).collection('users');
    
    let totalSynced = 0;
    const usersSnapshot = await usersRef.get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      try {
        const contactsRef = userDoc.ref.collection('emergencyContacts');
        const contactsSnapshot = await contactsRef.get();
        
        for (const contactDoc of contactsSnapshot.docs) {
          const contactData = contactDoc.data();
          
          try {
            await db_mongo.collection('emergency_contacts').updateOne(
              { firebaseId: contactDoc.id, userId },
              {
                $set: {
                  userId,
                  firebaseId: contactDoc.id,
                  ...contactData,
                  syncedAt: new Date(),
                }
              },
              { upsert: true }
            );
            totalSynced++;
          } catch (error) {
            if (!error.message.includes('duplicate')) {
              console.error(`    [!] Error syncing contact: ${error.message}`);
            }
          }
        }
      } catch (error) {
        // No emergency contacts for this user
      }
    }
    
    console.log(`[✓] Synced ${totalSynced} emergency contacts to MongoDB`);
    return totalSynced;
  } catch (error) {
    console.error('[!] Error syncing emergency contacts:', error);
    return 0;
  }
}

async function performFullSync() {
  console.log('='.repeat(70));
  console.log('FIREBASE TO MONGODB DATA SYNC');
  console.log('='.repeat(70));
  
  // Check prerequisites
  if (!mongoUri) {
    console.error('[!] MONGODB_URI not set in .env.local');
    return false;
  }
  
  if (!process.env.VITE_FIREBASE_API_KEY) {
    console.error('[!] Firebase configuration missing from .env.local');
    console.error('    Required: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc.');
    return false;
  }
  
  // Initialize connections
  const firebaseOK = await initializeFirebase();
  if (!firebaseOK) {
    console.error('[!] Firebase initialization failed');
    return false;
  }
  
  const mongoOK = await connectMongoDB();
  if (!mongoOK) {
    console.error('[!] MongoDB connection failed');
    return false;
  }
  
  console.log('[✓] Connected to both Firebase and MongoDB');
  console.log();
  
  // Sync all data
  const msgCount = await syncMessages();
  const userCount = await syncUserProfiles();
  const contactCount = await syncEmergencyContacts();
  
  console.log();
  console.log('='.repeat(70));
  console.log('SYNC COMPLETE!');
  console.log('='.repeat(70));
  console.log(`✅ Messages synced: ${msgCount}`);
  console.log(`✅ Users synced: ${userCount}`);
  console.log(`✅ Emergency contacts synced: ${contactCount}`);
  console.log(`✅ Total records: ${msgCount + userCount + contactCount}`);
  console.log();
  console.log('All Firebase data has been backed up to MongoDB!');
  console.log('='.repeat(70));
  
  return true;
}

// Main execution
(async () => {
  try {
    const success = await performFullSync();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('[FATAL]', error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
    if (admin.apps.length > 0) {
      await admin.app().delete();
    }
  }
})();
