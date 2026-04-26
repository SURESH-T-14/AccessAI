import React from 'react';

/**
 * Format bot responses for better readability
 * Converts plain text to formatted HTML with:
 * - Line breaks
 * - Bullet points
 * - Numbered lists
 * - Bold/italic text
 * - Section headers
 */
const FormattedMessage = ({ text }) => {
  if (!text) return null;

  const formatText = (input) => {
    if (typeof input !== 'string') return input;

    // Split by newlines and double newlines
    const lines = input.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Skip empty lines but preserve them
      if (!trimmed) return <br key={`empty-${idx}`} />;

      // Format headers (lines ending with :)
      if (trimmed.match(/^#+\s/) || trimmed.endsWith(':')) {
        return (
          <div 
            key={`header-${idx}`}
            style={{
              fontWeight: '700',
              fontSize: '1.05rem',
              marginTop: '0.75rem',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              paddingBottom: '0.25rem',
              borderBottom: '1px solid rgba(77, 159, 255, 0.2)'
            }}
          >
            {trimmed.replace(/^#+\s/, '')}
          </div>
        );
      }

      // Format bullet points
      if (trimmed.match(/^[-•*]\s/)) {
        return (
          <div 
            key={`bullet-${idx}`}
            style={{
              marginLeft: '1.5rem',
              marginBottom: '0.4rem',
              lineHeight: '1.6'
            }}
          >
            <span style={{ marginRight: '0.5rem' }}>•</span>
            {trimmed.replace(/^[-•*]\s/, '')}
          </div>
        );
      }

      // Format numbered lists
      if (trimmed.match(/^[0-9]+\.\s/)) {
        return (
          <div 
            key={`number-${idx}`}
            style={{
              marginLeft: '1.5rem',
              marginBottom: '0.4rem',
              lineHeight: '1.6'
            }}
          >
            {trimmed}
          </div>
        );
      }

      // Format bold text (**text**)
      let formattedLine = trimmed;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(formattedLine)) !== null) {
        parts.push(formattedLine.slice(lastIndex, match.index));
        parts.push(
          <strong key={`bold-${match.index}`} style={{ fontWeight: '700' }}>
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      parts.push(formattedLine.slice(lastIndex));

      return (
        <div 
          key={`line-${idx}`}
          style={{
            marginBottom: '0.5rem',
            lineHeight: '1.6',
            wordWrap: 'break-word'
          }}
        >
          {parts.length > 1 ? parts : formattedLine}
        </div>
      );
    });

    return lines;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    }}>
      {formatText(text)}
    </div>
  );
};

export default FormattedMessage;
