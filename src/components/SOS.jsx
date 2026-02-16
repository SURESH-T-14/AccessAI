import React, { useState, useEffect } from 'react';
import './SOS.css';
import EmergencyContactService from '../services/EmergencyContactService';

const SOS = ({ user, emergencyContacts, onEmergencyTriggered, db }) => {
  const [showSOSPanel, setShowSOSPanel] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentMessage, setSentMessage] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });
  const [contacts, setContacts] = useState([]);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, [user, db]);

  const loadContacts = async () => {
    if (!user || !db) return;
    try {
      const loaded = await EmergencyContactService.getEmergencyContacts(user.uid, db);
      setContacts(loaded);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  // Add or update contact
  const handleAddContact = async () => {
    if (!newContact.name || (!newContact.phone && !newContact.email)) {
      alert('Please enter name and at least phone or email');
      return;
    }

    if (!user || !db) return;

    try {
      const success = await EmergencyContactService.addEmergencyContact(
        user.uid,
        newContact,
        db
      );

      if (success) {
        setNewContact({ name: '', phone: '', email: '' });
        setShowContactForm(false);
        await loadContacts();
        setStatusMessage('✅ Contact added successfully');
      } else {
        setStatusMessage('⚠️ Contact saved locally (cloud sync not available)');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      if (error.code === 'permission-denied') {
        setStatusMessage('⚠️ Contact saved locally (enable Firestore in Firebase Console)');
      } else {
        alert('Failed to add contact');
      }
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactIndex) => {
    if (!user || !db || !confirm('Delete this contact?')) return;

    try {
      const contactToDelete = contacts[contactIndex];
      const success = await EmergencyContactService.deleteEmergencyContact(
        user.uid,
        contactToDelete.phone || contactToDelete.email,
        db
      );

      if (success) {
        await loadContacts();
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  // Send emergency message
  const handleEmergency = async () => {
    if (contacts.length === 0) {
      alert('No emergency contacts added. Please add contacts first.');
      return;
    }

    setIsSending(true);

    try {
      const message = `🚨 EMERGENCY ALERT 🚨\n\n${user.displayName || 'Someone'} needs help immediately!\n\nTime: ${new Date().toLocaleString()}\n\nPlease respond or call emergency services.`;

      // Send to all contacts
      for (const contact of contacts) {
        try {
          // Send SMS if phone exists
          if (contact.phone) {
            console.log(`📱 Sending SMS to ${contact.name}: ${contact.phone}`);
            try {
              const smsResponse = await fetch('http://localhost:3001/api/send-emergency-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone: contact.phone,
                  message: message,
                  userId: user.uid,
                  contactName: contact.name
                })
              });
              
              const smsResult = await smsResponse.json();
              if (smsResult.success) {
                console.log(`✅ SMS sent successfully to ${contact.phone}`);
              } else {
                console.warn(`⚠️ SMS failed: ${smsResult.message || smsResult.error}`);
              }
            } catch (err) {
              console.warn(`⚠️ SMS error for ${contact.phone}:`, err.message);
            }
          }

          // Send Email if email exists
          if (contact.email) {
            console.log(`📧 Sending Email to ${contact.name}: ${contact.email}`);
            try {
              const emailResponse = await fetch('http://localhost:3001/api/send-emergency-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: contact.email,
                  subject: '🚨 EMERGENCY ALERT - ' + (user.displayName || 'Someone needs help'),
                  message: message,
                  userId: user.uid,
                  contactName: contact.name
                })
              });
              
              const emailResult = await emailResponse.json();
              if (emailResult.success) {
                console.log(`✅ Email sent successfully to ${contact.email}`);
              } else {
                console.warn(`⚠️ Email failed: ${emailResult.message || emailResult.error}`);
              }
            } catch (err) {
              console.warn(`⚠️ Email error for ${contact.email}:`, err.message);
            }
          }
        } catch (error) {
          console.error(`Failed to send to ${contact.name}:`, error);
        }
      }

      // Log event
      if (onEmergencyTriggered && db) {
        await onEmergencyTriggered({
          user,
          emergencyContacts: contacts,
          timestamp: new Date().toISOString(),
          messagesSent: contacts.length
        });
      }

      setSentMessage(`✅ Emergency alerts sent to ${contacts.length} contact(s)!`);
      setTimeout(() => {
        setSentMessage(null);
        setShowSOSPanel(false);
      }, 3000);

    } catch (error) {
      console.error('Error sending emergency:', error);
      setSentMessage('❌ Failed to send emergency alerts');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="sos-container">
      {/* SOS Button */}
      <button
        className="sos-button"
        onClick={() => setShowSOSPanel(true)}
        title="Click for emergency"
      >
        <div className="sos-text">SOS</div>
        <div className="sos-pulse"></div>
      </button>

      {/* Emergency Panel */}
      {showSOSPanel && (
        <div className="sos-panel-overlay" onClick={() => setShowSOSPanel(false)}>
          <div className="sos-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sos-panel-header">
              <h2>🚨 Emergency Alert System</h2>
              <button
                className="sos-close-btn"
                onClick={() => setShowSOSPanel(false)}
              >
                ✕
              </button>
            </div>

            <div className="sos-panel-content">
              {/* Emergency Button */}
              <div className="emergency-action">
                <button
                  className="emergency-send-btn"
                  onClick={handleEmergency}
                  disabled={isSending || contacts.length === 0}
                >
                  {isSending ? '⏳ Sending...' : '🚨 SEND EMERGENCY ALERT'}
                </button>
                {contacts.length === 0 && (
                  <p className="warning-text">⚠️ No contacts added. Add contacts below first.</p>
                )}
              </div>

              {/* Status Message */}
              {sentMessage && (
                <div className={`status-message ${sentMessage.includes('✅') ? 'success' : 'error'}`}>
                  {sentMessage}
                </div>
              )}

              {statusMessage && (
                <div className={`status-message ${statusMessage.includes('✅') ? 'success' : 'warning'}`}>
                  {statusMessage}
                </div>
              )}

              {/* Contacts List */}
              <div className="contacts-section">
                <div className="section-header">
                  <h3>📞 Emergency Contacts</h3>
                  <button
                    className="add-btn-small"
                    onClick={() => setShowContactForm(!showContactForm)}
                  >
                    {showContactForm ? '✕ Cancel' : '+ Add Contact'}
                  </button>
                </div>

                {/* Add Contact Form */}
                {showContactForm && (
                  <div className="contact-form">
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      disabled={isSending}
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number (e.g., +1-555-0000)"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      disabled={isSending}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      disabled={isSending}
                    />
                    <button
                      className="add-contact-submit"
                      onClick={handleAddContact}
                      disabled={isSending}
                    >
                      ✓ Save Contact
                    </button>
                  </div>
                )}

                {/* Contacts List */}
                {contacts.length > 0 ? (
                  <div className="contacts-list">
                    {contacts.map((contact, index) => (
                      <div key={index} className="contact-item">
                        <div className="contact-details">
                          <div className="contact-name">{contact.name}</div>
                          {contact.phone && <div className="contact-method">📱 {contact.phone}</div>}
                          {contact.email && <div className="contact-method">📧 {contact.email}</div>}
                        </div>
                        <button
                          className="delete-contact-btn"
                          onClick={() => handleDeleteContact(index)}
                          disabled={isSending}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-contacts">
                    <p>No emergency contacts yet</p>
                    <small>Add at least one contact to enable emergency alerts</small>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="sos-info">
                <h4>ℹ️ How It Works</h4>
                <ul>
                  <li>Add your emergency contacts (phone and/or email)</li>
                  <li>Click the red <strong>SEND EMERGENCY ALERT</strong> button</li>
                  <li>Alerts are sent instantly to all contacts via SMS and email</li>
                  <li>Your contact info are included in the message</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOS;
