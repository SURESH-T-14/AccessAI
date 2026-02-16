@echo off
REM Quick Setup for Emergency Alert Backend

echo.
echo ========================================
echo Emergency Alert System - Quick Setup
echo ========================================
echo.

echo 1. Installing dependencies...
call npm install express cors twilio dotenv nodemailer

echo.
echo 2. Creating .env file template...
echo.
echo Please follow these steps:
echo.
echo STEP A - Twilio (SMS):
echo   1. Go to https://www.twilio.com/
echo   2. Sign up for free trial
echo   3. Get Account SID, Auth Token, and Phone Number
echo   4. Add to .env file
echo.
echo STEP B - Gmail (Email):
echo   1. Go to myaccount.google.com
echo   2. Enable 2-Step Verification
echo   3. Generate App Password for Gmail
echo   4. Add to .env file
echo.
echo Copy the content below into a new file called '.env':
echo.
echo # TWILIO SMS
echo TWILIO_ACCOUNT_SID=your_account_sid
echo TWILIO_AUTH_TOKEN=your_auth_token
echo TWILIO_FROM_PHONE=+1234567890
echo.
echo # EMAIL (Gmail)
echo EMAIL_SERVICE=gmail
echo EMAIL_USER=your-email@gmail.com
echo EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
echo.
echo PORT=3001
echo.
echo.
echo 3. After creating .env, run:
echo    node server.js
echo.
echo 4. In another terminal, run:
echo    npm run dev
echo.

pause
