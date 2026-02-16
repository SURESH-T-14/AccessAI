# 🤖 AccessAI

<div align="center">

![AccessAI Logo](logo.png)

**An AI-Powered Multi-Modal Accessibility Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-Flask-blue)](https://www.python.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.7.0-orange)](https://firebase.google.com/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## 📖 Overview

**AccessAI** is a comprehensive, accessibility-focused AI assistant platform designed to empower users with disabilities through cutting-edge technology. The platform combines conversational AI, gesture recognition, real-time translation, and emergency alert systems to create an inclusive digital experience.

### 🎯 Mission
To bridge the accessibility gap by providing an intelligent, multi-modal interface that adapts to users' needs, enabling seamless communication and interaction for people with visual, hearing, or motor impairments.

---

## ✨ Features

### 🤖 **AI Chat Assistant**
- Powered by Google Gemini AI for intelligent, context-aware conversations
- Natural language processing for understanding user intent
- Multi-turn conversation support with context retention
- Real-time streaming responses

### 🦾 **Hand Gesture Recognition**
- Real-time hand gesture detection using TensorFlow and MediaPipe
- Support for Indian Sign Language (ISL) and American Sign Language (ASL)
- Trained on 36+ gesture classes (A-Z, 0-9)
- Webcam-based gesture capture with visual feedback
- High accuracy gesture classification

### 🌐 **Multi-Language Translation**
- Text translation supporting 100+ languages
- Real-time translation API integration
- Support for common phrases and custom text
- Bidirectional translation support

### 🆘 **Emergency SOS System**
- One-click emergency alert system
- SMS notifications via Twilio
- Email alerts via Nodemailer
- Customizable emergency contacts
- Real-time status updates

### 🔍 **Google Search Integration**
- Quick web search capabilities
- Integrated search results display
- Voice-enabled search queries
- Safe search filtering

### 📁 **File Upload & Processing**
- Support for multiple file types (images, documents, PDFs)
- Client-side file processing
- Firebase Storage integration
- Secure file handling

### 🔐 **Multi-Method Authentication**
- Email/Password authentication
- Phone number verification (OTP)
- Google OAuth integration
- Firebase Authentication backend
- Secure user session management

### 📊 **Real-Time Data Synchronization**
- Firebase Firestore for real-time updates
- MongoDB for persistent storage
- Automated data sync service
- Chat history preservation

---

## 🛠 Tech Stack

### **Frontend**
```
React 19.2.0          - Modern UI framework with hooks and concurrent features
Vite 7.2.4            - Lightning-fast build tool and dev server
TailwindCSS 4.1.18    - Utility-first CSS framework
Lucide React          - Beautiful icon library
Firebase SDK 12.7.0   - Real-time database and authentication
```

### **Backend - Node.js**
```
Express 4.22.1        - Web application framework
Twilio 4.23.0         - SMS and voice communications
Nodemailer 6.10.1     - Email sending service
MongoDB Driver 7.1.0  - Database connectivity
CORS                  - Cross-origin resource sharing
```

### **Backend - Python**
```
Flask                 - Lightweight web framework
TensorFlow           - Machine learning framework
OpenCV               - Computer vision library
MediaPipe            - Hand landmark detection
PyMongo              - MongoDB Python driver
scikit-learn         - ML model training
```

### **AI & ML Services**
```
Google Gemini API     - Conversational AI (@google/genai)
TensorFlow.js         - Browser-based machine learning
MediaPipe Hands       - Hand pose detection model
OpenAI API            - Advanced NLP and translation
Unsplash API          - Image search and generation
```

### **Databases**
```
Firebase Firestore    - Real-time NoSQL database
MongoDB               - Document-based persistent storage
```

---

## 🏗 Architecture

AccessAI follows a **microservices architecture** with multiple specialized services:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  React Frontend (Vite + TailwindCSS + Firebase Auth)        │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ NLP Service  │  │ Translation  │  │ Real-time    │     │
│  │              │  │ Service      │  │ Data Service │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Backend APIs                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Express API  │  │ Gesture API  │  │ Translation  │     │
│  │ (Node.js)    │  │ (Python)     │  │ API (Python) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              External Services & Databases                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Google       │  │ Firebase     │  │ MongoDB      │     │
│  │ Gemini AI    │  │ Firestore    │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Twilio SMS   │  │ Gmail SMTP   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)

---

## 🚀 Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (local or Atlas)
- **Firebase Account**
- **API Keys** (Google Gemini, Twilio, OpenAI, Unsplash)

### 1. Clone the Repository
```bash
git clone https://github.com/SURESH-T-14/AccessAI.git
cd AccessAI
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your API keys to .env
# VITE_FIREBASE_API_KEY=your_firebase_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Backend Setup (Node.js)
```bash
# Environment variables are already loaded from .env
# Ensure MongoDB connection string is configured
# MONGODB_URI=mongodb://localhost:27017/accessai
# TWILIO_ACCOUNT_SID=your_twilio_sid
# TWILIO_AUTH_TOKEN=your_twilio_token
```

### 4. Python Services Setup
```bash
# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install Python dependencies
pip install flask tensorflow opencv-python mediapipe pymongo python-dotenv flask-cors scikit-learn argostranslate

# Download gesture recognition models (if not present)
# The models will be trained on first run or you can use pre-trained models
```

### 5. Firebase Configuration
```bash
# 1. Create a Firebase project at https://firebase.google.com/
# 2. Enable Authentication (Email, Phone, Google)
# 3. Create a Firestore database
# 4. Download your service account key as firebase-service-account.json
# 5. Place it in the root directory (it's gitignored for security)
```

---

## 🎮 Usage

### Starting the Application

#### Option 1: Start All Services Together
```bash
npm start
```
This will concurrently start:
- Frontend dev server (Vite) on `http://localhost:5173`
- Backend Express server on `http://localhost:3001`

#### Option 2: Start Services Individually

**Frontend:**
```bash
npm run dev
```

**Backend (Node.js):**
```bash
npm run server
```

**Python Services:**
```bash
# Activate Python environment first
.venv\Scripts\activate

# Start Gesture Recognition API
python gesture_api_server_simple.py

# Start Translation API
python translate_api.py

# Start Firebase-MongoDB Sync
python sync_firebase_to_mongodb.py
```

### Using the Application

#### 1. **Sign Up / Login**
- Choose authentication method (Email, Phone, or Google)
- Complete verification process
- Access the main dashboard

#### 2. **AI Chat**
- Type your message in the chat input
- Receive AI-powered responses from Google Gemini
- View conversation history in the sidebar
- Start new conversations anytime

#### 3. **Gesture Recognition**
- Open the Gesture Control feature
- Allow camera permissions
- Perform hand gestures in front of the camera
- See real-time recognition results
- Use recognized gestures to control the interface

#### 4. **Translation**
- Select source and target languages
- Enter text to translate
- View instant translation results
- Copy translated text for use elsewhere

#### 5. **Emergency SOS**
- Configure emergency contacts in Settings
- In emergency, click the SOS button
- SMS and email alerts sent immediately
- View delivery status in real-time

#### 6. **File Upload**
- Click the file upload icon
- Select files (images, PDFs, documents)
- Files are processed and stored securely
- View uploaded files in your chat history

---

## 📁 Project Structure

```
AccessAI/
├── src/                          # React frontend source
│   ├── components/               # React components
│   │   ├── Login.jsx            # Authentication UI
│   │   ├── ChatSidebar.jsx      # Chat navigation
│   │   ├── SOSSystem.jsx        # Emergency alerts
│   │   ├── FileUpload.jsx       # File handling
│   │   ├── GestureControl.jsx   # Gesture interface
│   │   └── Translator.jsx       # Translation UI
│   ├── services/                 # Frontend services
│   │   ├── NLPService.js        # Natural language processing
│   │   ├── TranslationService.js # Translation logic
│   │   ├── RealTimeDataService.js # Firebase sync
│   │   └── EmergencyContactService.js # SOS handling
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   ├── App.jsx                   # Main app component
│   └── main.jsx                  # Entry point
├── public/                       # Static assets
├── server.js                     # Express backend server
├── gesture_api_server_simple.py  # Gesture recognition API
├── translate_api.py              # Translation API
├── image_generator.py            # Image generation service
├── nlp_processor.py              # NLP processing service
├── sync_firebase_to_mongodb.py   # Data sync service
├── mongodb_connection.py         # MongoDB utilities
├── package.json                  # Node.js dependencies
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS config
└── .env.example                 # Environment variables template

Python Services:
├── gesture_api_server_simple.py  # Gesture recognition endpoint
├── translate_api.py              # Translation endpoint
├── train_gesture_classifier.py   # ML model training
└── gesture_labels.json           # Gesture class mappings
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# AI Services
VITE_GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/accessai

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Email (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password

# Google Search (Optional)
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

---

## 🧪 Testing

### Run Frontend Tests
```bash
npm run lint
```

### Test Backend APIs
```bash
# Test Express server
curl http://localhost:3001/api/health

# Test Gesture API (when running)
curl http://localhost:5000/api/gesture/health

# Test Translation API
curl http://localhost:5001/api/translate/health
```

### Test ML Model Accuracy
```bash
python test_model_accuracy.py
```

---

## 📚 Documentation

Comprehensive documentation is available in the repository:

- [System Architecture](SYSTEM_ARCHITECTURE.md) - Complete system design
- [Firebase Setup Guide](FIREBASE_SETUP.md) - Firebase configuration
- [Gesture Training Guide](GESTURE_TRAINING_GUIDE.md) - ML model training
- [SOS Quick Start](SOS_QUICK_START.md) - Emergency system setup
- [Translator Integration](TRANSLATOR_INTEGRATION.md) - Translation setup
- [Real-Time Data Guide](REAL_TIME_DATA_GUIDE.md) - Data sync configuration
- [Developer's Guide](DEVELOPERS_GUIDE.md) - Development guidelines

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**SURESH-T-14**
- GitHub: [@SURESH-T-14](https://github.com/SURESH-T-14)
- Repository: [AccessAI](https://github.com/SURESH-T-14/AccessAI)

---

## 🙏 Acknowledgments

- **Google Gemini** - For providing the powerful AI API
- **Firebase** - For authentication and real-time database services
- **TensorFlow & MediaPipe** - For hand gesture recognition capabilities
- **Twilio** - For SMS emergency notifications
- **OpenAI** - For translation and NLP services
- **React & Vite** - For the excellent frontend development experience

---

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on [GitHub Issues](https://github.com/SURESH-T-14/AccessAI/issues)
- Check the [Documentation Index](DOCUMENTATION_INDEX.md)
- Review existing documentation files

---

<div align="center">

**Made with ❤️ for accessibility and inclusion**

⭐ Star this repository if you find it helpful!

</div>
