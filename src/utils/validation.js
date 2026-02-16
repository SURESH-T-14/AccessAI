/**
 * Input Validation Utilities
 * Provides functions to validate and sanitize user inputs
 */

/**
 * Validate chat message input
 * @param {string} text - The message text to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
export const validateChatInput = (text) => {
  if (!text) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (text.length > 5000) {
    return { valid: false, error: 'Message is too long (maximum 5000 characters)' };
  }
  
  if (text.trim().length === 0) {
    return { valid: false, error: 'Message cannot contain only whitespace' };
  }
  
  return { valid: true };
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} text - The text to sanitize
 * @returns {string} - Sanitized text
 */
export const sanitizeInput = (text) => {
  if (typeof text !== 'string') return '';
  // Remove HTML tags
  return text.replace(/<[^>]*>/g, '').trim();
};

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - true if valid email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 * @param {string} url - The URL to validate
 * @returns {boolean} - true if valid URL
 */
export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Truncate text to a maximum length with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
