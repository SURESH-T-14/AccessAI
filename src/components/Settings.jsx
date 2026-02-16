import React, { useState } from 'react';
import './Settings.css';
import EmergencyContactsManager from './EmergencyContactsManager';

const Settings = ({ 
  theme, setTheme,
  fontSize, setFontSize,
  soundEnabled, setSoundEnabled,
  showTimestamps, setShowTimestamps,
  autoSave, setAutoSave,
  language, setLanguage,
  onClose,
  user,
  db
}) => {
  const [showEmergencyManager, setShowEmergencyManager] = useState(false);
  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2><img src="/settings.png" alt="Settings" style={{ width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle' }} /> Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          {/* Emergency Contacts Section */}
          <div className="settings-section emergency-section">
            <h3>Emergency Contacts</h3>
            <p className="section-description">Manage emergency contacts for SOS alerts</p>
            <button 
              className="action-btn emergency-btn"
              onClick={() => setShowEmergencyManager(true)}
            >
              Manage Emergency Contacts
            </button>
          </div>

          {/* Appearance Section */}
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-group">
              <label>Theme</label>
              <div className="button-group">
                {['light', 'dark', 'auto'].map(t => (
                  <button
                    key={t}
                    className={`theme-btn ${theme === t ? 'active' : ''}`}
                    onClick={() => setTheme(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label>Font Size</label>
              <div className="button-group">
                {['small', 'medium', 'large'].map(size => (
                  <button
                    key={size}
                    className={`size-btn ${fontSize === size ? 'active' : ''}`}
                    onClick={() => setFontSize(size)}
                    style={{ fontSize: size === 'small' ? '12px' : size === 'large' ? '18px' : '14px' }}
                  >
                    {size.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound & Audio Section */}
          <div className="settings-section">
            <h3>Sound & Audio</h3>
            <div className="setting-group">
              <label>Sound Effects</label>
              <button
                className={`toggle-btn ${soundEnabled ? 'enabled' : 'disabled'}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                <span className="toggle-indicator"></span>
                {soundEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          {/* Display Section */}
          <div className="settings-section">
            <h3>Display</h3>
            <div className="setting-group">
              <label>Show Timestamps</label>
              <button
                className={`toggle-btn ${showTimestamps ? 'enabled' : 'disabled'}`}
                onClick={() => setShowTimestamps(!showTimestamps)}
              >
                <span className="toggle-indicator"></span>
                {showTimestamps ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          {/* Data & Storage Section */}
          <div className="settings-section">
            <h3>Data & Storage</h3>
            <div className="setting-group">
              <label>Auto-save Conversations</label>
              <button
                className={`toggle-btn ${autoSave ? 'enabled' : 'disabled'}`}
                onClick={() => setAutoSave(!autoSave)}
              >
                <span className="toggle-indicator"></span>
                {autoSave ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <div className="button-group">
              <button className="action-btn export-btn">Export Chat History</button>
              <button className="action-btn clear-btn">Clear All Data</button>
            </div>
          </div>

          {/* Language Section */}
          <div className="settings-section">
            <h3>Language</h3>
            <div className="setting-group">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="hi">हिन्दी</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>

          {/* About Section */}
          <div className="settings-section">
            <h3>About</h3>
            <div className="about-content">
              <p><strong>AccessAI Pro</strong></p>
              <p>Version 1.0.0</p>
              <p>Build Date: January 9, 2026</p>
              <div className="features-list">
                <h4>Features:</h4>
                <ul>
                  <li>Real-time Gesture Recognition</li>
                  <li>Advanced NLP Processing</li>
                  <li>Multi-Chat Support</li>
                  <li>Customizable Interface</li>
                  <li>Audio Feedback</li>
                  <li>Multi-Language Support</li>
                  <li>Responsive Design</li>
                  <li>High Performance</li>
                  <li>Privacy-Focused</li>
                  <li>Cloud Integration</li>
                </ul>
              </div>
              <div className="credits">
                <h4>Tech Stack:</h4>
                <p>React • Flask • MediaPipe • Gemini • Firebase • TensorFlow</p>
              </div>
            </div>
          </div>

          {/* Help & Support Section */}
          <div className="settings-section">
            <h3>Help & Support</h3>
            <div className="help-buttons">
              <button className="help-btn">Documentation</button>
              <button className="help-btn">Report a Bug</button>
              <button className="help-btn">Feature Suggestion</button>
              <button className="help-btn">Contact Support</button>
            </div>
          </div>
        </div>

        {showEmergencyManager && (
          <EmergencyContactsManager
            user={user}
            db={db}
            onClose={() => setShowEmergencyManager(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;
