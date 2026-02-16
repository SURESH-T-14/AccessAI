import React, { useState, useCallback } from 'react';
import './Toast.css';
import { X } from 'lucide-react';

/**
 * Toast Context for managing toast notifications globally
 */
export const ToastContext = React.createContext();

/**
 * Toast Provider - Wrap your app with this
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Toast Component
 */
const Toast = ({ message, type = 'info', onClose }) => {
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
};

/**
 * Hook to use toast notifications
 */
export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    console.warn('useToast must be used within ToastProvider');
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {}
    };
  }
  
  return {
    success: (msg, duration) => context.addToast(msg, 'success', duration),
    error: (msg, duration) => context.addToast(msg, 'error', duration),
    info: (msg, duration) => context.addToast(msg, 'info', duration),
    warning: (msg, duration) => context.addToast(msg, 'warning', duration),
  };
};

export default Toast;
