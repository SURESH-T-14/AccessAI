// Quick test to verify email configuration
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

console.log('Testing Email Configuration...');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configured***' : 'NOT SET');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);

const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD
  }
});

// Test sending
async function testEmail() {
  try {
    console.log('\nSending test email...');
    const info = await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self
      subject: '🚨 SOS Test Email',
      html: '<h1>Test Emergency Alert</h1><p>If you receive this, your email is working!</p>'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Email error:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
