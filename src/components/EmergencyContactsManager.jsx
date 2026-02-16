import React, { useState, useEffect } from 'react';
import './EmergencyContactsManager.css';
import EmergencyContactService from '../services/EmergencyContactService';

const EmergencyContactsManager = ({ user, db, onClose }) => {
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: 'Friend' });
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, [user, db]);

  const loadContacts = async () => {
    if (!user || !db) return;
    setIsLoading(true);
    try {
      const loadedContacts = await EmergencyContactService.getEmergencyContacts(user.uid, db);
      setContacts(loadedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) {
      alert('Please fill in name and phone number');
      return;
    }

    if (!user || !db) return;

    setIsLoading(true);
    try {
      const success = await EmergencyContactService.addEmergencyContact(
        user.uid,
        newContact,
        db
      );

      if (success) {
        setNewContact({ name: '', phone: '', relationship: 'Friend' });
        await loadContacts();
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteContact = async (phone) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;

    if (!user || !db) return;

    setIsLoading(true);
    try {
      const success = await EmergencyContactService.deleteEmergencyContact(
        user.uid,
        phone,
        db
      );

      if (success) {
        await loadContacts();
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="emergency-manager-overlay" onClick={onClose}>
      <div className="emergency-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="manager-header">
          <h2>🚨 Emergency Contacts</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="manager-content">
          <div className="add-contact-section">
            <h3>Add Emergency Contact</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                disabled={isLoading}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                disabled={isLoading}
              />
              <select
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                disabled={isLoading}
              >
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Emergency Service">Emergency Service</option>
                <option value="Other">Other</option>
              </select>
              <button 
                onClick={addContact} 
                disabled={isLoading}
                className="add-btn"
              >
                {isLoading ? 'Adding...' : '+ Add Contact'}
              </button>
            </div>
          </div>

          <div className="contacts-list-section">
            <h3>Your Emergency Contacts ({contacts.length})</h3>
            {contacts.length === 0 ? (
              <div className="no-contacts">
                <p>No emergency contacts added yet</p>
                <small>Add contacts above to enable SOS notifications</small>
              </div>
            ) : (
              <div className="contacts-list">
                {contacts.map((contact, index) => (
                  <div key={index} className="contact-card">
                    <div className="contact-info">
                      <div className="contact-name">{contact.name}</div>
                      <div className="contact-phone">{contact.phone}</div>
                      <div className="contact-relationship">{contact.relationship}</div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => deleteContact(contact.phone)}
                      disabled={isLoading}
                      title="Delete contact"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="manager-info">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>Click the <strong>SOS</strong> button in the bottom left to activate emergency mode</li>
              <li>Show the danger image to your camera</li>
              <li>Emergency alerts will be sent to all contacts automatically</li>
              <li>Your location and contact info will be shared with emergency contacts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContactsManager;
