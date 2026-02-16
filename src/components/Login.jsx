import React, { useState } from 'react';
import './Login.css';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';

// Complete list of countries with phone codes
const COUNTRIES = [
  { name: 'Afghanistan', code: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: '+213', flag: '🇩🇿' },
  { name: 'Andorra', code: '+376', flag: '🇦🇩' },
  { name: 'Angola', code: '+244', flag: '🇦🇴' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷' },
  { name: 'Armenia', code: '+374', flag: '🇦🇲' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', code: '+994', flag: '🇦🇿' },
  { name: 'Bahamas', code: '+1-242', flag: '🇧🇸' },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩' },
  { name: 'Barbados', code: '+1-246', flag: '🇧🇧' },
  { name: 'Belarus', code: '+375', flag: '🇧🇾' },
  { name: 'Belgium', code: '+32', flag: '🇧🇪' },
  { name: 'Belize', code: '+501', flag: '🇧🇿' },
  { name: 'Benin', code: '+229', flag: '🇧🇯' },
  { name: 'Bhutan', code: '+975', flag: '🇧🇹' },
  { name: 'Bolivia', code: '+591', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', code: '+387', flag: '🇧🇦' },
  { name: 'Botswana', code: '+267', flag: '🇧🇼' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Brunei', code: '+673', flag: '🇧🇳' },
  { name: 'Bulgaria', code: '+359', flag: '🇧🇬' },
  { name: 'Burkina Faso', code: '+226', flag: '🇧🇫' },
  { name: 'Burundi', code: '+257', flag: '🇧🇮' },
  { name: 'Cambodia', code: '+855', flag: '🇰🇭' },
  { name: 'Cameroon', code: '+237', flag: '🇨🇲' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Cape Verde', code: '+238', flag: '🇨🇻' },
  { name: 'Central African Republic', code: '+236', flag: '🇨🇫' },
  { name: 'Chad', code: '+235', flag: '🇹🇩' },
  { name: 'Chile', code: '+56', flag: '🇨🇱' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴' },
  { name: 'Comoros', code: '+269', flag: '🇰🇲' },
  { name: 'Congo', code: '+242', flag: '🇨🇬' },
  { name: 'Costa Rica', code: '+506', flag: '🇨🇷' },
  { name: 'Croatia', code: '+385', flag: '🇭🇷' },
  { name: 'Cuba', code: '+53', flag: '🇨🇺' },
  { name: 'Cyprus', code: '+357', flag: '🇨🇾' },
  { name: 'Czech Republic', code: '+420', flag: '🇨🇿' },
  { name: 'Denmark', code: '+45', flag: '🇩🇰' },
  { name: 'Djibouti', code: '+253', flag: '🇩🇯' },
  { name: 'Dominica', code: '+1-767', flag: '🇩🇲' },
  { name: 'Dominican Republic', code: '+1-809', flag: '🇩🇴' },
  { name: 'East Timor', code: '+670', flag: '🇹🇱' },
  { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬' },
  { name: 'El Salvador', code: '+503', flag: '🇸🇻' },
  { name: 'Equatorial Guinea', code: '+240', flag: '🇬🇶' },
  { name: 'Eritrea', code: '+291', flag: '🇪🇷' },
  { name: 'Estonia', code: '+372', flag: '🇪🇪' },
  { name: 'Ethiopia', code: '+251', flag: '🇪🇹' },
  { name: 'Fiji', code: '+679', flag: '🇫🇯' },
  { name: 'Finland', code: '+358', flag: '🇫🇮' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Gabon', code: '+241', flag: '🇬🇦' },
  { name: 'Gambia', code: '+220', flag: '🇬🇲' },
  { name: 'Georgia', code: '+995', flag: '🇬🇪' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'Ghana', code: '+233', flag: '🇬🇭' },
  { name: 'Greece', code: '+30', flag: '🇬🇷' },
  { name: 'Grenada', code: '+1-473', flag: '🇬🇩' },
  { name: 'Guatemala', code: '+502', flag: '🇬🇹' },
  { name: 'Guinea', code: '+224', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', code: '+245', flag: '🇬🇼' },
  { name: 'Guyana', code: '+592', flag: '🇬🇾' },
  { name: 'Haiti', code: '+509', flag: '🇭🇹' },
  { name: 'Honduras', code: '+504', flag: '🇭🇳' },
  { name: 'Hong Kong', code: '+852', flag: '🇭🇰' },
  { name: 'Hungary', code: '+36', flag: '🇭🇺' },
  { name: 'Iceland', code: '+354', flag: '🇮🇸' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
  { name: 'Iran', code: '+98', flag: '🇮🇷' },
  { name: 'Iraq', code: '+964', flag: '🇮🇶' },
  { name: 'Ireland', code: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: '+972', flag: '🇮🇱' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Ivory Coast', code: '+225', flag: '🇨🇮' },
  { name: 'Jamaica', code: '+1-876', flag: '🇯🇲' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'Jordan', code: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', code: '+7', flag: '🇰🇿' },
  { name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { name: 'Kiribati', code: '+686', flag: '🇰🇮' },
  { name: 'Kosovo', code: '+383', flag: '🇽🇰' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
  { name: 'Kyrgyzstan', code: '+996', flag: '🇰🇬' },
  { name: 'Laos', code: '+856', flag: '🇱🇦' },
  { name: 'Latvia', code: '+371', flag: '🇱🇻' },
  { name: 'Lebanon', code: '+961', flag: '🇱🇧' },
  { name: 'Lesotho', code: '+266', flag: '🇱🇸' },
  { name: 'Liberia', code: '+231', flag: '🇱🇷' },
  { name: 'Libya', code: '+218', flag: '🇱🇾' },
  { name: 'Liechtenstein', code: '+423', flag: '🇱🇮' },
  { name: 'Lithuania', code: '+370', flag: '🇱🇹' },
  { name: 'Luxembourg', code: '+352', flag: '🇱🇺' },
  { name: 'Macau', code: '+853', flag: '🇲🇴' },
  { name: 'Macedonia', code: '+389', flag: '🇲🇰' },
  { name: 'Madagascar', code: '+261', flag: '🇲🇬' },
  { name: 'Malawi', code: '+265', flag: '🇲🇼' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾' },
  { name: 'Maldives', code: '+960', flag: '🇲🇻' },
  { name: 'Mali', code: '+223', flag: '🇲🇱' },
  { name: 'Malta', code: '+356', flag: '🇲🇹' },
  { name: 'Marshall Islands', code: '+692', flag: '🇲🇭' },
  { name: 'Mauritania', code: '+222', flag: '🇲🇷' },
  { name: 'Mauritius', code: '+230', flag: '🇲🇺' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { name: 'Micronesia', code: '+691', flag: '🇫🇲' },
  { name: 'Moldova', code: '+373', flag: '🇲🇩' },
  { name: 'Monaco', code: '+377', flag: '🇲🇨' },
  { name: 'Mongolia', code: '+976', flag: '🇲🇳' },
  { name: 'Montenegro', code: '+382', flag: '🇲🇪' },
  { name: 'Morocco', code: '+212', flag: '🇲🇦' },
  { name: 'Mozambique', code: '+258', flag: '🇲🇿' },
  { name: 'Myanmar', code: '+95', flag: '🇲🇲' },
  { name: 'Namibia', code: '+264', flag: '🇳🇦' },
  { name: 'Nauru', code: '+674', flag: '🇳🇷' },
  { name: 'Nepal', code: '+977', flag: '🇳🇵' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { name: 'Nicaragua', code: '+505', flag: '🇳🇮' },
  { name: 'Niger', code: '+227', flag: '🇳🇪' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'North Korea', code: '+850', flag: '🇰🇵' },
  { name: 'Norway', code: '+47', flag: '🇳🇴' },
  { name: 'Oman', code: '+968', flag: '🇴🇲' },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰' },
  { name: 'Palau', code: '+680', flag: '🇵🇼' },
  { name: 'Palestine', code: '+970', flag: '🇵🇸' },
  { name: 'Panama', code: '+507', flag: '🇵🇦' },
  { name: 'Papua New Guinea', code: '+675', flag: '🇵🇬' },
  { name: 'Paraguay', code: '+595', flag: '🇵🇾' },
  { name: 'Peru', code: '+51', flag: '🇵🇪' },
  { name: 'Philippines', code: '+63', flag: '🇵🇭' },
  { name: 'Poland', code: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: '+351', flag: '🇵🇹' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦' },
  { name: 'Romania', code: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: '+7', flag: '🇷🇺' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼' },
  { name: 'Saint Kitts and Nevis', code: '+1-869', flag: '🇰🇳' },
  { name: 'Saint Lucia', code: '+1-758', flag: '🇱🇨' },
  { name: 'Saint Vincent and the Grenadines', code: '+1-784', flag: '🇻🇨' },
  { name: 'Samoa', code: '+685', flag: '🇼🇸' },
  { name: 'San Marino', code: '+378', flag: '🇸🇲' },
  { name: 'Sao Tome and Principe', code: '+239', flag: '🇸🇹' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'Senegal', code: '+221', flag: '🇸🇳' },
  { name: 'Serbia', code: '+381', flag: '🇷🇸' },
  { name: 'Seychelles', code: '+248', flag: '🇸🇨' },
  { name: 'Sierra Leone', code: '+232', flag: '🇸🇱' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Slovakia', code: '+421', flag: '🇸🇰' },
  { name: 'Slovenia', code: '+386', flag: '🇸🇮' },
  { name: 'Solomon Islands', code: '+677', flag: '🇸🇧' },
  { name: 'Somalia', code: '+252', flag: '🇸🇴' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷' },
  { name: 'South Sudan', code: '+211', flag: '🇸🇸' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Sri Lanka', code: '+94', flag: '🇱🇰' },
  { name: 'Sudan', code: '+249', flag: '🇸🇩' },
  { name: 'Suriname', code: '+597', flag: '🇸🇷' },
  { name: 'Swaziland', code: '+268', flag: '🇸🇿' },
  { name: 'Sweden', code: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
  { name: 'Syria', code: '+963', flag: '🇸🇾' },
  { name: 'Taiwan', code: '+886', flag: '🇹🇼' },
  { name: 'Tajikistan', code: '+992', flag: '🇹🇯' },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
  { name: 'Thailand', code: '+66', flag: '🇹🇭' },
  { name: 'Togo', code: '+228', flag: '🇹🇬' },
  { name: 'Tonga', code: '+676', flag: '🇹🇴' },
  { name: 'Trinidad and Tobago', code: '+1-868', flag: '🇹🇹' },
  { name: 'Tunisia', code: '+216', flag: '🇹🇳' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷' },
  { name: 'Turkmenistan', code: '+993', flag: '🇹🇲' },
  { name: 'Tuvalu', code: '+688', flag: '🇹🇻' },
  { name: 'Uganda', code: '+256', flag: '🇺🇬' },
  { name: 'Ukraine', code: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾' },
  { name: 'Uzbekistan', code: '+998', flag: '🇺🇿' },
  { name: 'Vanuatu', code: '+678', flag: '🇻🇺' },
  { name: 'Vatican', code: '+379', flag: '🇻🇦' },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪' },
  { name: 'Vietnam', code: '+84', flag: '🇻🇳' },
  { name: 'Yemen', code: '+967', flag: '🇾🇪' },
  { name: 'Zambia', code: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe', code: '+263', flag: '🇿🇼' }
];

const Login = ({ auth, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState(null); // 'email', 'phone', 'google'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationUser, setEmailVerificationUser] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(c => c.code === '+91') || COUNTRIES[0]); // Default to India

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Store user with photoURL
      const userData = {
        ...result.user,
        photoURL: result.user.photoURL
      };
      onLoginSuccess(userData);
    } catch (err) {
      setError(`Google login failed: ${err.message}`);
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      let result;
      if (isSignUp) {
        if (!name) {
          setError('Please enter your name');
          return;
        }
        result = await createUserWithEmailAndPassword(auth, email, password);
        // Update user profile with name
        await updateProfile(result.user, { displayName: name });
        
        // Send verification email
        await sendEmailVerification(result.user);
        setEmailVerificationUser(result.user);
        setShowEmailVerification(true);
        setMessage('✉️ Verification email sent! Check your inbox for the confirmation link.');
        setLoginMethod(null);
        setEmail('');
        setPassword('');
        setName('');
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(result.user);
      }
    } catch (err) {
      console.error('📧 Email login error details:', err);
      console.error('Error code:', err.code);
      
      if (err.code === 'auth/user-not-found') {
        setError('❌ Email not found.\n\n✅ This email is not registered.\n\n👉 NEXT STEPS:\n1. Click the "CREATE ACCOUNT" button below\n2. Enter your name, email, and password\n3. Verify your email\n4. Then you can sign in');
      } else if (err.code === 'auth/wrong-password') {
        setError('❌ Wrong password.\n\n✅ SOLUTIONS:\n✓ Check password spelling carefully\n✓ Check if CAPS LOCK is ON (turn it OFF)\n✓ Passwords are case-sensitive (A ≠ a)\n✓ Try again\n\n💡 Forgot password? Try signing in with Google instead');
      } else if (err.code === 'auth/invalid-credential') {
        setError('❌ Invalid email or password.\n\n✅ THIS COULD MEAN:\n1. This email never signed up → Click "CREATE ACCOUNT" button\n2. Wrong password → Check spelling (case matters!)\n3. Email not verified → Check inbox for verification link\n\n👉 WHAT TO DO:\n• New user? → Click "CREATE ACCOUNT" below\n• Existing user? → Double-check email & password\n• Still stuck? → Try Google Sign In instead');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('✅ This email is already registered!\n\n👉 TO SIGN IN:\n1. Click the "SIGN IN" button below\n2. Use the same email\n3. Enter your password\n4. Log in\n\n💡 If you forgot the password:\n• Try signing in with Google instead\n• Or create new account with different email');
      } else if (err.code === 'auth/weak-password') {
        setError('❌ Password too weak.\n\n✅ MAKE YOUR PASSWORD STRONGER:\n• At least 6 characters long\n• Mix of letters AND numbers\n\nGood examples:\n✓ password123\n✓ myPass2024\n✓ secure99word');
      } else if (err.code === 'auth/too-many-requests') {
        setError('⏳ Too many login attempts.\n\nYour account has been temporarily blocked for security.\n\n✅ WAIT 5-10 MINUTES then try again.\n\n💡 In the meantime:\n• Try Google Sign In\n• Try Phone Sign In\n• Reset your password');
      } else if (err.code === 'auth/invalid-email') {
        setError('❌ Invalid email format.\n\n✅ EXAMPLES OF VALID EMAILS:\n✓ user@gmail.com\n✓ john.smith@example.com\n✓ contact@company.org\n\n❌ INVALID FORMATS:\n✗ user@.com\n✗ user@domain\n✗ @gmail.com');
      } else {
        setError(`📧 Email login failed: ${err.message}\n\nError code: ${err.code}\n\n💡 Try:\n• Google Sign In above\n• Phone authentication\n• Check internet connection`);
      }
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha verified');
        }
      });
    }
    return window.recaptchaVerifier;
  };

  const handlePhoneSendCode = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter phone number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const recaptchaVerifier = setupRecaptcha();
      const phoneWithCountry = phone.startsWith('+') ? phone : `${selectedCountry.code}${phone}`;
      
      console.log('📱 Attempting to send OTP to:', phoneWithCountry);
      console.log('🌍 Country:', selectedCountry.name, selectedCountry.code);
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneWithCountry, recaptchaVerifier);
      setConfirmationResult(confirmationResult);
      setShowVerification(true);
      setMessage(`📱 OTP sent to ${phoneWithCountry}! Check your SMS.`);
    } catch (err) {
      console.error('🔴 Phone login error details:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      // Better error messages
      if (err.code === 'auth/operation-not-allowed') {
        setError('⚠️ Phone Authentication is NOT ENABLED in Firebase Console.\n\n✅ REQUIRED ACTION:\n1. Go to Firebase Console\n2. Authentication → Sign-in method\n3. Enable "Phone"\n4. Save\n5. Reload this page\n\nSee ENABLE_PHONE_AUTH.md for detailed steps.');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('❌ Invalid phone number format. Please check:\n- Country code is correct\n- Phone number is valid for that country');
      } else if (err.code === 'auth/too-many-requests') {
        setError('⏳ Too many attempts. Please wait a few minutes before trying again.');
      } else {
        setError(`Phone login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode || !confirmationResult) {
      setError('Please enter OTP code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await confirmationResult.confirm(verificationCode);
      onLoginSuccess(result.user);
    } catch (err) {
      console.error('🔴 OTP verification error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('❌ Invalid OTP code. Please check and try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('⏳ OTP code expired. Please request a new one.');
      } else {
        setError(`OTP verification failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerificationCheck = async (e) => {
    e.preventDefault();
    if (!emailVerificationUser) {
      setError('No user found for verification');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Reload user to check if email is verified
      await emailVerificationUser.reload();
      
      if (emailVerificationUser.emailVerified) {
        setMessage('✅ Email verified successfully!');
        onLoginSuccess(emailVerificationUser);
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      setError(`Verification check failed: ${err.message}`);
      console.error('Email verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationEmail = async (e) => {
    e.preventDefault();
    if (!emailVerificationUser) {
      setError('No user found');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await sendEmailVerification(emailVerificationUser);
      setMessage('✉️ Verification email resent! Check your inbox.');
    } catch (err) {
      setError(`Failed to resend email: ${err.message}`);
      console.error('Resend email error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.png" alt="AccessAI Logo" className="login-logo" />
          <h1>AccessAI</h1>
          <p>Sign in to continue</p>
        </div>

        {error && (
          <div className="login-error">
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '1rem' }}>{error}</div>
            {(error.includes('CREATE ACCOUNT') || error.includes('auth-already-in-use')) && !isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                  setPassword('');
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  width: '100%',
                  marginTop: '0.5rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                ✓ CREATE ACCOUNT
              </button>
            )}
            {(error.includes('SIGN IN') || error.includes('Click the "SIGN IN"')) && isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                  setName('');
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  width: '100%',
                  marginTop: '0.5rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                ✓ SIGN IN
              </button>
            )}
          </div>
        )}
        {message && <div className="login-message">{message}</div>}

        {!loginMethod ? (
          <div className="login-methods">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="login-btn google-btn"
            >
              <img src="/google.png" alt="Google" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              Continue with Google
            </button>

            <button
              onClick={() => setLoginMethod('email')}
              disabled={loading}
              className="login-btn email-btn"
            >
              <img src="/gmail.png" alt="Email" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              Continue with Email
            </button>

            <button
              onClick={() => setLoginMethod('phone')}
              disabled={loading}
              className="login-btn phone-btn"
            >
              <img src="/phone.png" alt="Phone" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              Continue with Phone
            </button>
          </div>
        ) : loginMethod === 'email' ? (
          <form onSubmit={handleEmailLogin} className="login-form">
            {isSignUp && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="login-input"
              />
            )}
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              className="login-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              className="login-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>

            <div className="login-toggle">
              <p>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setName('');
                  }}
                  disabled={loading}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLoginMethod(null)}
              disabled={loading}
              className="login-back-btn"
            >
              ← Back
            </button>
          </form>
        ) : loginMethod === 'phone' ? (
          <form onSubmit={showVerification ? handlePhoneVerify : handlePhoneSendCode} className="login-form">
            {!showVerification ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: '#666' }}>
                  📱 Enter your phone number to receive OTP
                </div>

                {/* Country Code Selector */}
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const country = COUNTRIES.find(c => c.code === e.target.value);
                    if (country) setSelectedCountry(country);
                  }}
                  disabled={loading}
                  className="login-input"
                  style={{ marginBottom: '12px' }}
                >
                  {COUNTRIES.map((country, index) => (
                    <option key={`${country.code}-${index}`} value={country.code}>
                      {country.flag} {country.name} ({country.code})
                    </option>
                  ))}
                </select>

                {/* Phone Number Input */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <div style={{
                    padding: '14px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#333',
                    minWidth: '100px',
                  }}>
                    {selectedCountry.code}
                  </div>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    autoComplete="tel"
                    className="login-input"
                    style={{ flex: 1 }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: '#666' }}>
                  🔐 Enter the 6-digit OTP sent to your phone
                </div>
                <input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                  disabled={loading}
                  maxLength="6"
                  className="login-input"
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 'bold' }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn"
                >
                  {loading ? 'Verifying OTP...' : 'Verify OTP'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setLoginMethod(null);
                setShowVerification(false);
                setPhone('');
                setVerificationCode('');
                setError('');
                setSelectedCountry(COUNTRIES.find(c => c.code === '+91') || COUNTRIES[0]);
              }}
              disabled={loading}
              className="login-back-btn"
            >
              ← Back
            </button>
          </form>
        ) : showEmailVerification ? (
          <div className="login-form">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>✉️</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Verify Your Email</h3>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                We've sent a confirmation link to {emailVerificationUser?.email}
              </p>
            </div>

            <div style={{
              padding: '16px',
              background: '#f0f4ff',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#333'
            }}>
              <strong>📧 Steps:</strong>
              <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Check your email inbox</li>
                <li>Click the verification link</li>
                <li>Return here and click "Verify Email"</li>
              </ol>
            </div>

            <button
              onClick={handleEmailVerificationCheck}
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? 'Checking...' : '✓ Verify Email'}
            </button>

            <button
              onClick={handleResendVerificationEmail}
              disabled={loading}
              style={{
                marginTop: '8px',
                padding: '12px 16px',
                background: '#f5f5f5',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                color: '#667eea',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.background = '#efefef'}
              onMouseOut={(e) => e.target.style.background = '#f5f5f5'}
            >
              📧 Resend Email
            </button>

            <button
              type="button"
              onClick={() => {
                setShowEmailVerification(false);
                setEmailVerificationUser(null);
                setLoginMethod(null);
                setError('');
                setMessage('');
              }}
              disabled={loading}
              className="login-back-btn"
              style={{ marginTop: '8px' }}
            >
              ← Back to Login
            </button>
          </div>
        ) : null}

        <div id="recaptcha-container"></div>
      </div>

      <div className="login-footer">
        <p>Secure authentication powered by Firebase</p>
      </div>
    </div>
  );
};

export default Login;
