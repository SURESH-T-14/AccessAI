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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    smsConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM_PHONE),
    emailConfigured: !!(process.env.EMAIL_USER && (process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD)),
    timestamp: new Date()
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  // Silent mode - minimal output
  console.log(`[SOS] Backend running on port ${PORT}`);
});
