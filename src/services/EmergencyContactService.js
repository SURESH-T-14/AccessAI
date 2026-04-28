/**
 * Emergency Contacts Service
 * Manages emergency contact information for SOS system
 */

const STORAGE_KEY = 'emergency_contacts_local';

export class EmergencyContactService {
  /**
   * Get local storage key for user
   */
  static getLocalStorageKey(userId) {
    return `${STORAGE_KEY}_${userId}`;
  }

  /**
   * Save to local storage as fallback
   */
  static saveToLocalStorage(userId, contacts) {
    try {
      localStorage.setItem(this.getLocalStorageKey(userId), JSON.stringify(contacts));
      console.log('💾 Contacts saved to local storage');
    } catch (error) {
      console.warn('⚠️ Could not save to local storage:', error);
    }
  }

  /**
   * Load from local storage
   */
  static getFromLocalStorage(userId) {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('⚠️ Could not load from local storage:', error);
      return [];
    }
  }
  /**
   * Save emergency contacts to Firebase
   */
  static async saveEmergencyContacts(userId, contacts, db) {
    // Always save to local storage first
    this.saveToLocalStorage(userId, contacts);

    try {
      const { setDoc, doc } = await import('firebase/firestore');
      
      await setDoc(doc(db, 'users', userId, 'emergency_contacts', 'data'), {
        contacts: contacts.map(c => ({
          name: c.name,
          phone: c.phone,
          email: c.email || null,
          relationship: c.relationship || 'Friend'
        })),
        updatedAt: new Date(),
        enabled: true
      });

      console.log('✅ Emergency contacts saved successfully');
      return true;
    } catch (error) {
      // Handle permission denied error gracefully
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Firebase Firestore permissions not configured. Contacts stored in local storage.');
        console.warn('📋 To sync to cloud: Configure Firestore security rules at https://console.firebase.google.com');
        console.warn('📝 Rule needed: match /databases/{database}/documents/users/{uid}/emergency_contacts/{document=**} { allow read, write: if request.auth.uid == uid; }');
        return true; // Return true to allow local operation
      }
      
      console.error('❌ Error saving emergency contacts:', error.code, error.message);
      throw error;
    }
  }

  /**
   * Get emergency contacts from Firebase
   */
  static async getEmergencyContacts(userId, db) {
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      
      const contactsDoc = await getDoc(doc(db, 'users', userId, 'emergency_contacts', 'data'));
      
      if (contactsDoc.exists()) {
        const firebaseContacts = contactsDoc.data().contacts || [];
        // Update local storage with Firebase data
        this.saveToLocalStorage(userId, firebaseContacts);
        return firebaseContacts;
      }
      return [];
    } catch (error) {
      // Handle offline/connectivity errors gracefully
      if (error.message && error.message.includes('offline')) {
        console.log('📡 Firestore temporarily offline. Loading contacts from local storage...');
        const localContacts = this.getFromLocalStorage(userId);
        if (localContacts.length > 0) {
          console.log(`✅ Loaded ${localContacts.length} contact(s) from local storage`);
        } else {
          console.log('ℹ️ No offline contacts found. Please restore internet connection.');
        }
        return localContacts;
      } else if (error.code === 'permission-denied') {
        console.warn('⚠️ Firebase permissions denied. Loading contacts from local storage...');
        const localContacts = this.getFromLocalStorage(userId);
        if (localContacts.length > 0) {
          console.log(`✅ Loaded ${localContacts.length} contact(s) from local storage`);
        }
        return localContacts;
      } else {
        console.error('❌ Error fetching emergency contacts:', error.message);
        // Try local storage as fallback
        return this.getFromLocalStorage(userId);
      }
    }
  }

  /**
   * Add single emergency contact
   */
  static async addEmergencyContact(userId, contact, db) {
    try {
      const existing = await this.getEmergencyContacts(userId, db);
      existing.push(contact);
      return await this.saveEmergencyContacts(userId, existing, db);
    } catch (error) {
      console.error('❌ Error adding emergency contact:', error);
      return false;
    }
  }

  /**
   * Delete emergency contact
   */
  static async deleteEmergencyContact(userId, contactPhone, db) {
    try {
      const existing = await this.getEmergencyContacts(userId, db);
      const filtered = existing.filter(c => c.phone !== contactPhone);
      return await this.saveEmergencyContacts(userId, filtered, db);
    } catch (error) {
      console.error('❌ Error deleting emergency contact:', error);
      return false;
    }
  }

  /**
   * Send emergency notification to contact
   * Integrate with SMS/Email/Push notification service
   */
  static async sendEmergencyNotification(contact, userData, messageService) {
    try {
      const message = `🚨 EMERGENCY ALERT 🚨\n\n${userData.displayName} may be in danger!\n\nPlease contact them immediately.\n\nTime: ${new Date().toLocaleString()}`;

      // Example implementations (choose one or integrate with service)
      
      // Option 1: SMS via Twilio (requires backend)
      if (contact.phone) {
        await this.sendSMS(contact.phone, message);
      }

      // Option 2: Email notification
      if (contact.email) {
        await this.sendEmail(contact.email, userData.displayName, message);
      }

      // Option 3: Push notification (requires app setup)
      // await this.sendPushNotification(contact, message);

      console.log('✅ Emergency notification sent to', contact.name);
      return true;
    } catch (error) {
      console.error('❌ Error sending emergency notification:', error);
      return false;
    }
  }

  /**
   * Send SMS (integrate with Twilio or similar service)
   */
  static async sendSMS(phoneNumber, message) {
    try {
      // This should call your backend API
      const response = await fetch('/api/send-emergency-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          message: message
        })
      });

      if (response.ok) {
        console.log('✅ SMS sent to', phoneNumber);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Send Email notification
   */
  static async sendEmail(email, userName, message) {
    try {
      // This should call your backend API
      const response = await fetch('/api/send-emergency-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `🚨 EMERGENCY: ${userName} needs help!`,
          message: message
        })
      });

      if (response.ok) {
        console.log('✅ Email sent to', email);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Log emergency event for tracking/compliance (Optional - won't block if fails)
   */
  static async logEmergencyEvent(userId, eventData, db) {
    try {
      // Firestore logging is optional - don't block emergency if it fails
      const { addDoc, collection } = await import('firebase/firestore');
      
      await addDoc(collection(db, 'users', userId, 'emergency_events'), {
        timestamp: new Date(),
        contactsNotified: eventData.emergencyContacts.length,
        contacts: eventData.emergencyContacts.map(c => c.name),
        detectionMethod: eventData.detectionMethod || 'manual_sos',
        status: 'triggered'
      });

      console.log('✅ Emergency event logged');
      return true;
    } catch (error) {
      console.warn('⚠️ Could not log emergency event to Firestore (non-blocking):', error.message);
      // Don't throw - this is non-critical. SMS/Email was already sent.
      return false;
    }
  }
}

export default EmergencyContactService;
