import React, { useState } from 'react';
import './ChatSidebar.css';

const ChatSidebar = ({ 
  chats, 
  currentChatId, 
  onSwitchChat, 
  onCreateChat, 
  onRenameChat, 
  onDeleteChat,
  onOpenSettings,
  animatedGlyph,
  animatedImage
}) => {
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");

  const handleRename = (chatId, currentName) => {
    setRenamingId(chatId);
    setRenameText(currentName);
  };

  const confirmRename = (chatId) => {
    if (renameText.trim()) {
      onRenameChat(chatId, renameText.trim());
    }
    setRenamingId(null);
    setRenameText("");
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/chat.png" alt="Chats" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <h2 style={{ margin: '0' }}>Chats</h2>
        </div>
        <button 
          className="new-chat-btn"
          onClick={onCreateChat}
          title="Create new chat"
        >
          <img src="/new chat.png" alt="New Chat" style={{ width: '18px', height: '18px', marginRight: '6px', verticalAlign: 'middle' }} />
          New Chat
        </button>
      </div>

      <div className="chats-list">
        {chats.map(chat => (
          <div
            key={chat.id}
            className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
          >
            <div 
              className="chat-main"
              onClick={() => onSwitchChat(chat.id)}
            >
              {renamingId === chat.id ? (
                <input
                  type="text"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={() => confirmRename(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename(chat.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  autoFocus
                  className="chat-rename-input"
                />
              ) : (
                <>
                  <img src="/chat.png" alt="Chat" className="chat-icon" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                  <div className="chat-info">
                    <div className="chat-name">{chat.name}</div>
                    <div className="chat-meta">
                      {chat.messages?.length || 0} messages
                    </div>
                  </div>
                  <div className="chat-time">
                    {formatDate(chat.timestamp)}
                  </div>
                </>
              )}
            </div>

            {currentChatId === chat.id && !renamingId && (
              <div className="chat-actions">
                <button
                  className="action-icon edit-icon"
                  onClick={() => handleRename(chat.id, chat.name)}
                  title="Rename chat"
                >
                  <img src="/rename.png" alt="Rename" style={{ width: '18px', height: '18px' }} />
                </button>
                {chats.length > 1 && (
                  <button
                    className="action-icon delete-icon"
                    onClick={() => {
                      if (window.confirm('Delete this chat?')) {
                        onDeleteChat(chat.id);
                      }
                    }}
                    title="Delete chat"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visual Bot Display */}
      <div className="visual-bot-section">
        <p className="visual-bot-label">🤖 VISUAL BOT</p>
        <div className="visual-bot-display">
          {animatedImage ? (
            <img 
              src={animatedImage} 
              alt="sign" 
              className="visual-bot-image"
            />
          ) : animatedGlyph ? (
            <div className="visual-bot-glyph">
              {animatedGlyph}
            </div>
          ) : (
            <div className="visual-bot-ready">
              🤖
              <div className="ready-text">BOT READY</div>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <button 
          className="settings-btn"
          onClick={onOpenSettings}
          title="Open settings"
        >
          <img src="/settings.png" alt="Settings" style={{ width: '18px', height: '18px', marginRight: '8px' }} />
          Settings
        </button>
      </div>
    </div>
  );
};

export default ChatSidebar;
