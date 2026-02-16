import React, { useState, useEffect } from 'react';
import RealTimeDataService from '../services/RealTimeDataService';
import './RealTimeDataMonitor.css';

const RealTimeDataMonitor = () => {
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [expandedSections, setExpandedSections] = useState({
    flask: true,
    google: true,
    gemini: true,
    nlp: true,
    system: true,
    localStorage: true
  });

  // Fetch all real-time data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await RealTimeDataService.fetchAllRealTimeData();
      setAllData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching real-time data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const StatusBadge = ({ status }) => {
    const isOnline = status === 'online' || status === true || status === 'available';
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: isOnline ? '#10B981' : '#EF4444',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      }}>
        {isOnline ? '✓ Online' : '✗ Offline'}
      </span>
    );
  };

  const SectionHeader = ({ title, section, status }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
      cursor: 'pointer',
      userSelect: 'none'
    }} onClick={() => toggleSection(section)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.2rem' }}>{expandedSections[section] ? '▼' : '▶'}</span>
        <h3 style={{ margin: 0, color: '#6366F1' }}>{title}</h3>
      </div>
      {status && <StatusBadge status={status} />}
    </div>
  );

  const DataDisplay = ({ data }) => {
    if (!data) return <p style={{ padding: '12px', color: '#999' }}>No data</p>;

    if (typeof data === 'object' && !Array.isArray(data)) {
      return (
        <div style={{ padding: '12px' }}>
          <pre style={{
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.85rem',
            maxHeight: '300px'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div style={{ padding: '12px' }}>
        <p>{String(data)}</p>
      </div>
    );
  };

  if (!allData) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#999'
      }}>
        {loading ? '⏳ Loading real-time data...' : '❌ Failed to load data'}
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'rgba(99, 102, 241, 0.03)',
      borderRadius: '8px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      {/* Header Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '6px'
      }}>
        <h2 style={{ margin: 0, color: '#6366F1' }}>📊 Real-Time Data Monitor</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-Refresh
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #6366F1',
                backgroundColor: 'transparent',
                color: '#6366F1',
                cursor: 'pointer'
              }}
            >
              <option value={1000}>1s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6366F1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Fetching...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          ⚠️ Error: {error}
        </div>
      )}

      {/* Last Updated */}
      {allData.timestamp && (
        <p style={{
          fontSize: '0.85rem',
          color: '#999',
          marginBottom: '20px',
          textAlign: 'right'
        }}>
          Last updated: {new Date(allData.timestamp).toLocaleTimeString()}
        </p>
      )}

      {/* Flask Status */}
      <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
        <SectionHeader
          title="🐍 Flask Backend"
          section="flask"
          status={allData.flaskStatus?.status}
        />
        {expandedSections.flask && (
          <DataDisplay data={allData.flaskStatus} />
        )}
      </div>

      {/* Gesture History */}
      {expandedSections.flask && allData.gestureHistory && (
        <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h3 style={{ margin: 0, color: '#6366F1' }}>🤟 Gesture History (Last 10)</h3>
          </div>
          <div style={{ padding: '12px' }}>
            {allData.gestureHistory?.history?.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {allData.gestureHistory.history.map((gesture, idx) => (
                  <li key={idx} style={{ marginBottom: '6px', fontSize: '0.9rem' }}>
                    {gesture.gesture || gesture} - {gesture.confidence}%
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#999' }}>No gestures detected yet</p>
            )}
          </div>
        </div>
      )}

      {/* Google Search Status */}
      <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
        <SectionHeader
          title="🔍 Google Search API"
          section="google"
          status={allData.googleSearchStatus?.available}
        />
        {expandedSections.google && (
          <DataDisplay data={allData.googleSearchStatus} />
        )}
      </div>

      {/* Gemini Status */}
      <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
        <SectionHeader
          title="✨ Gemini AI API"
          section="gemini"
          status={allData.geminiStatus?.available}
        />
        {expandedSections.gemini && (
          <DataDisplay data={allData.geminiStatus} />
        )}
      </div>

      {/* NLP Capabilities */}
      <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
        <SectionHeader
          title="🧠 NLP Capabilities"
          section="nlp"
          status={true}
        />
        {expandedSections.nlp && (
          <div style={{ padding: '12px' }}>
            {allData.nlpCapabilities && Object.entries(allData.nlpCapabilities).map(([key, value]) => (
              key !== 'timestamp' && (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                  <span style={{ textTransform: 'capitalize', color: '#6366F1' }}>{key}:</span>
                  <span style={{ color: value === 'available' ? '#10B981' : '#EF4444' }}>
                    {value === 'available' ? '✓' : '✗'}
                  </span>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* System Metrics */}
      <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
        <SectionHeader
          title="💻 System Metrics"
          section="system"
          status={true}
        />
        {expandedSections.system && (
          <DataDisplay data={allData.systemMetrics} />
        )}
      </div>

      {/* LocalStorage */}
      <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
        <SectionHeader
          title="💾 LocalStorage"
          section="localStorage"
          status={true}
        />
        {expandedSections.localStorage && (
          <DataDisplay data={allData.localStorageData} />
        )}
      </div>

      {/* Translation Languages */}
      {expandedSections.flask && allData.translationLanguages && (
        <div style={{ marginBottom: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h3 style={{ margin: 0, color: '#6366F1' }}>🌐 Translation Languages ({allData.translationLanguages?.count || 0})</h3>
          </div>
          <div style={{ padding: '12px' }}>
            {allData.translationLanguages?.languages && Object.keys(allData.translationLanguages.languages).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                {Object.keys(allData.translationLanguages.languages).slice(0, 20).map(lang => (
                  <span key={lang} style={{
                    padding: '6px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}>
                    {lang}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999' }}>No languages available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeDataMonitor;
