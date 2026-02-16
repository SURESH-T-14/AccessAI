import React, { useState, useEffect } from 'react';

const PerformanceMonitor = ({ metrics }) => {
  const [displayMetrics, setDisplayMetrics] = useState({
    fps: 0,
    detectionTime: 0,
    apiTime: 0,
    totalLatency: 0,
    memoryUsage: 0,
    confidence: 0,
    frameCount: 0
  });

  useEffect(() => {
    if (metrics) {
      setDisplayMetrics(metrics);
    }
  }, [metrics]);

  const getHealthStatus = () => {
    if (displayMetrics.fps < 10) return { color: '#EF4444', status: 'Poor' };
    if (displayMetrics.fps < 20) return { color: '#F59E0B', status: 'Fair' };
    if (displayMetrics.fps < 30) return { color: '#FBBF24', status: 'Good' };
    return { color: '#10B981', status: 'Excellent' };
  };

  const health = getHealthStatus();

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      background: 'rgba(15, 15, 15, 0.95)',
      border: '1px solid rgba(77, 159, 255, 0.3)',
      borderRadius: '12px',
      padding: '1rem',
      minWidth: '280px',
      fontSize: '0.85rem',
      fontFamily: 'monospace',
      color: 'var(--text-primary)',
      zIndex: 1000,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Title */}
      <div style={{
        marginBottom: '0.75rem',
        fontWeight: 'bold',
        fontSize: '0.95rem',
        color: '#0E78F5',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        ⚡ Performance Monitor
      </div>

      {/* Health Status */}
      <div style={{
        padding: '0.5rem',
        background: 'rgba(77, 159, 255, 0.1)',
        borderRadius: '8px',
        marginBottom: '0.75rem',
        textAlign: 'center'
      }}>
        <div style={{ color: health.color, fontWeight: 'bold' }}>
          {health.status}
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          System Health
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem'
      }}>
        {/* FPS */}
        <div style={{ background: 'rgba(77, 159, 255, 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>FPS</div>
          <div style={{ fontWeight: 'bold', color: displayMetrics.fps > 25 ? '#10B981' : '#F59E0B' }}>
            {Math.round(displayMetrics.fps)}
          </div>
        </div>

        {/* Detection Time */}
        <div style={{ background: 'rgba(77, 159, 255, 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>Detection</div>
          <div style={{ fontWeight: 'bold', color: displayMetrics.detectionTime < 50 ? '#10B981' : '#F59E0B' }}>
            {Math.round(displayMetrics.detectionTime)}ms
          </div>
        </div>

        {/* API Response Time */}
        <div style={{ background: 'rgba(77, 159, 255, 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>API</div>
          <div style={{ fontWeight: 'bold', color: displayMetrics.apiTime < 200 ? '#10B981' : '#F59E0B' }}>
            {Math.round(displayMetrics.apiTime)}ms
          </div>
        </div>

        {/* Total Latency */}
        <div style={{ background: 'rgba(77, 159, 255, 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>Latency</div>
          <div style={{ fontWeight: 'bold', color: displayMetrics.totalLatency < 300 ? '#10B981' : '#F59E0B' }}>
            {Math.round(displayMetrics.totalLatency)}ms
          </div>
        </div>

        {/* Gesture Confidence */}
        <div style={{ background: 'rgba(77, 159, 255, 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>Confidence</div>
          <div style={{ fontWeight: 'bold', color: displayMetrics.confidence > 70 ? '#10B981' : '#F59E0B' }}>
            {Math.round(displayMetrics.confidence)}%
          </div>
        </div>

        {/* Memory Usage */}
        <div style={{ background: 'rgba(77, 159, 255, 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>Memory</div>
          <div style={{ fontWeight: 'bold', color: displayMetrics.memoryUsage < 100 ? '#10B981' : '#F59E0B' }}>
            {Math.round(displayMetrics.memoryUsage)}MB
          </div>
        </div>
      </div>

      {/* Performance Bars */}
      <div style={{ marginTop: '0.75rem' }}>
        {/* FPS Bar */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.2rem' }}>FPS (target: 30)</div>
          <div style={{
            height: '4px',
            background: 'rgba(77, 159, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min((displayMetrics.fps / 30) * 100, 100)}%`,
              background: displayMetrics.fps > 25 ? '#10B981' : '#F59E0B',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Detection Bar */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.2rem' }}>Detection (target: &lt;50ms)</div>
          <div style={{
            height: '4px',
            background: 'rgba(77, 159, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min((50 / displayMetrics.detectionTime) * 100, 100)}%`,
              background: displayMetrics.detectionTime < 50 ? '#10B981' : '#F59E0B',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Confidence Bar */}
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.2rem' }}>Confidence</div>
          <div style={{
            height: '4px',
            background: 'rgba(77, 159, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${displayMetrics.confidence}%`,
              background: displayMetrics.confidence > 70 ? '#10B981' : '#F59E0B',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Frame Count */}
      <div style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid rgba(77, 159, 255, 0.2)',
        fontSize: '0.7rem',
        opacity: 0.6
      }}>
        Frames: {displayMetrics.frameCount}
      </div>
    </div>
  );
};

export default PerformanceMonitor;
