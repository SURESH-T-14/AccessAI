import React from 'react';
import './LoadingSpinner.css';

/**
 * LoadingSpinner Component
 * Displays an animated loading spinner
 * @param {object} props
 * @param {string} props.size - 'small', 'medium', or 'large'
 * @param {string} props.color - Color of spinner (default: 'indigo')
 * @param {string} props.fullScreen - Whether to cover full screen
 */
const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'indigo', 
  fullScreen = false,
  text = 'Loading...'
}) => {
  return (
    <div className={`loading-spinner-wrapper ${fullScreen ? 'full-screen' : ''}`}>
      <div className={`loading-spinner ${size}`} style={{ borderTopColor: `rgb(99, 102, 241)` }}>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
