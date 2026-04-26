/**
 * Emergency Alert Backend Server
 * Handles SMS and Email sending for the SOS system
 * 
 * Setup Instructions:
 * 1. npm install express cors twilio dotenv nodemailer
 * 2. Create .env file with credentials (see .env.example)
 * 3. node server.js
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { MongoClient, ObjectId } from 'mongodb';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB setup
let mongoClient;
let db;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'accessai_db';

// Connect to MongoDB
if (MONGODB_URI) {
  mongoClient = new MongoClient(MONGODB_URI);
  mongoClient.connect()
    .then(() => {
      db = mongoClient.db(MONGODB_DB_NAME);
      console.log('[MongoDB] Connected successfully');
    })
    .catch(err => {
      console.error('[MongoDB] Connection failed:', err.message);
    });
} else {
  console.warn('[MongoDB] MONGODB_URI not configured in .env');
}

// Firebase Realtime Database setup
let firebaseDb = null;
if (process.env.FIREBASE_DATABASE_URL) {
  try {
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      // Load service account JSON
      const serviceAccountPath = path.join(__dirname, 'firebase-admin-sdk.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        console.log('[Firebase] Service account loaded successfully');
      } else {
        console.warn('[Firebase] Service account JSON not found at:', serviceAccountPath);
        console.warn('[Firebase] Using default credentials (may fail if not in GCP environment)');
        admin.initializeApp({
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }
    }
    firebaseDb = admin.database();
    console.log('[Firebase] Connected to Realtime Database');
  } catch (err) {
    console.error('[Firebase] Connection failed:', err.message);
  }
} else {
  console.warn('[Firebase] FIREBASE_DATABASE_URL not configured in .env');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Increase body size limit for image uploads (50MB)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Twilio client (only if configured)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Initialize Email transporter (Gmail, SendGrid, or any SMTP)
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD
  }
});

// ============================================
// SMS ENDPOINT
// ============================================
app.post('/api/send-emergency-sms', async (req, res) => {
  try {
    const { phone, message, userId, contactName } = req.body;

    // Validate inputs
    if (!phone || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone and message are required'
      });
    }

    // Check if Twilio is configured
    if (!twilioClient || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_FROM_PHONE) {
      console.warn('⚠️ Twilio not configured. SMS not sent to:', phone);
      return res.status(200).json({
        status: 'warning',
        message: 'SMS service not configured. Configure Twilio in .env file.',
        phone: phone,
        contactName: contactName
      });
    }

    // Format phone number (add country code if not present)
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

    // Send SMS via Twilio
    const smsResponse = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_PHONE,
      to: formattedPhone
    });

    console.log(`✅ SMS sent to ${contactName} (${formattedPhone}) - SID: ${smsResponse.sid}`);

    res.status(200).json({
      success: true,
      status: 'sent',
      message: `SMS sent to ${contactName}`,
      phone: formattedPhone,
      messageSid: smsResponse.sid,
      contactName: contactName,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ SMS Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: `Failed to send SMS: ${error.message}`,
      error: error.message
    });
  }
});

// ============================================
// EMAIL ENDPOINT
// ============================================
app.post('/api/send-emergency-email', async (req, res) => {
  try {
    const { email, subject, message, userId, contactName } = req.body;

    // Validate inputs
    if (!email || !subject || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, subject, and message are required'
      });
    }

    // Check if Email is configured
    if (!process.env.EMAIL_USER || (!process.env.EMAIL_PASSWORD && !process.env.EMAIL_APP_PASSWORD)) {
      console.warn('⚠️ Email not configured. EMAIL_USER:', process.env.EMAIL_USER, 'Has Password:', !!(process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD));
      return res.status(200).json({
        status: 'warning',
        message: 'Email service not configured. Configure email in .env file.',
        email: email,
        contactName: contactName
      });
    }

    // Format message as HTML
    const htmlMessage = message
      .split('\n')
      .map(line => `<p>${line}</p>`)
      .join('');

    // Send Email
    const emailResponse = await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0;">🚨 EMERGENCY ALERT 🚨</h2>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; border-left: 4px solid #EF4444;">
            ${htmlMessage}
          </div>
          <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated emergency alert. Please respond immediately if you receive this message.</p>
            <p>Time: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    });

    console.log(`✅ Email sent to ${contactName} (${email}) - MessageID: ${emailResponse.messageId}`);

    res.status(200).json({
      success: true,
      status: 'sent',
      message: `Email sent to ${contactName}`,
      email: email,
      messageId: emailResponse.messageId,
      contactName: contactName,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Email Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: `Failed to send email: ${error.message}`,
      error: error.message
    });
  }
});

// ============================================
// IMAGE STORAGE ENDPOINT (MongoDB)
// ============================================
app.post('/api/store-image', async (req, res) => {
  try {
    const { userId, chatId, prompt, imageData, model } = req.body;

    if (!userId || !chatId || !imageData) {
      return res.status(400).json({
        status: 'error',
        message: 'userId, chatId, and imageData are required'
      });
    }

    if (!db) {
      return res.status(503).json({
        status: 'error',
        message: 'MongoDB not connected'
      });
    }

    // Store image in MongoDB
    const imageDoc = {
      userId,
      chatId,
      prompt,
      image: imageData,
      model: model || 'huggingface',
      size: imageData.length,
      createdAt: new Date(),
      timestamp: Date.now()
    };

    const result = await db.collection('generated_images').insertOne(imageDoc);

    console.log(`✅ Image stored in MongoDB: ${result.insertedId}`);

    res.status(200).json({
      success: true,
      imageId: result.insertedId.toString(),
      message: 'Image stored successfully',
      size: imageData.length
    });
  } catch (error) {
    console.error('❌ Image storage error:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to store image: ${error.message}`
    });
  }
});

// ============================================
// GET STORED IMAGES
// ============================================
app.get('/api/get-images/:userId/:chatId', async (req, res) => {
  try {
    const { userId, chatId } = req.params;

    if (!db) {
      return res.status(503).json({
        status: 'error',
        message: 'MongoDB not connected'
      });
    }

    const images = await db.collection('generated_images')
      .find({ userId, chatId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    res.status(200).json({
      success: true,
      images: images.map(img => ({
        id: img._id.toString(),
        prompt: img.prompt,
        image: img.image,
        model: img.model,
        createdAt: img.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Get images error:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to get images: ${error.message}`
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    smsConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM_PHONE),
    emailConfigured: !!(process.env.EMAIL_USER && (process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD)),
    mongodbConfigured: !!db,
    timestamp: new Date()
  });
});

// ============================================
// ESP32 DEVICE INTEGRATION
// ============================================

// Configuration for ESP32 devices
const ESP32_DEVICES = {
  main: {
    ip: process.env.ESP32_IP || 'http://192.168.1.100',
    port: process.env.ESP32_PORT || 80,
    name: 'Main Emergency Alert Device'
  }
};

// Trigger ESP32 device alert via Firebase
app.post('/api/trigger-esp32-alert', async (req, res) => {
  try {
    const { deviceId = 'main', duration = 120000 } = req.body;

    // Try Firebase first (global, cloud-based)
    if (firebaseDb) {
      try {
        await firebaseDb.ref(`/devices/esp32/buzzer`).update({
          trigger: 1,
          duration: duration,
          triggered_at: admin.database.ServerValue.TIMESTAMP
        });
        
        console.log(`✅ ESP32 Alert Triggered via Firebase (${deviceId}): ${duration}ms`);

        res.status(200).json({
          success: true,
          message: `Alert triggered on ${deviceId} via Firebase`,
          device: deviceId,
          duration: duration,
          method: 'firebase',
          timestamp: new Date()
        });
        return;
      } catch (firebaseError) {
        console.warn('⚠️ Firebase trigger failed, trying local HTTP:', firebaseError.message);
      }
    }

    // Fallback to local HTTP if Firebase fails
    const device = ESP32_DEVICES[deviceId];
    if (!device) {
      return res.status(404).json({
        status: 'error',
        message: `Device '${deviceId}' not found`
      });
    }

    const url = `${device.ip}:${device.port}/trigger?duration=${duration}`;
    
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 5000 
    });
    
    if (!response.ok) {
      throw new Error(`ESP32 returned status ${response.status}`);
    }

    const data = await response.text();
    console.log(`✅ ESP32 Alert Triggered (Local HTTP, ${deviceId}): ${data}`);

    res.status(200).json({
      success: true,
      message: `Alert triggered on ${device.name} via local HTTP`,
      device: deviceId,
      duration: duration,
      method: 'local_http',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ ESP32 Alert Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: `Failed to trigger ESP32 alert: ${error.message}`
    });
  }
});

// Get ESP32 device status from Firebase
app.get('/api/esp32-status/:deviceId', async (req, res) => {
  try {
    const { deviceId = 'main' } = req.params;

    // Try Firebase first
    if (firebaseDb) {
      try {
        const snapshot = await firebaseDb.ref(`/devices/esp32/status`).once('value');
        const status = snapshot.val();
        
        if (status) {
          console.log(`✅ ESP32 Status retrieved from Firebase`);
          res.status(200).json({
            success: true,
            device: deviceId,
            status: status,
            method: 'firebase',
            timestamp: new Date()
          });
          return;
        }
      } catch (firebaseError) {
        console.warn('⚠️ Firebase status read failed, trying local HTTP:', firebaseError.message);
      }
    }

    // Fallback to local HTTP if Firebase fails
    const device = ESP32_DEVICES[deviceId];
    if (!device) {
      return res.status(404).json({
        status: 'error',
        message: `Device '${deviceId}' not found`
      });
    }

    const url = `${device.ip}:${device.port}/status`;
    
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`ESP32 returned status ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ ESP32 Status retrieved via HTTP`);

    res.status(200).json({
      success: true,
      device: deviceId,
      status: data,
      method: 'local_http',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ ESP32 Status Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: `Failed to get ESP32 status: ${error.message}`
    });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  // Silent mode - minimal output
  console.log(`[SOS] Backend running on port ${PORT}`);
});
