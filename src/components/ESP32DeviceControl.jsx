import React, { useState, useEffect } from 'react';
import { AlertCircle, Zap, CheckCircle2, XCircle, Settings } from 'lucide-react';

const ESP32DeviceControl = () => {
  const [deviceStatus, setDeviceStatus] = useState('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [duration, setDuration] = useState(3000);
  const [showSettings, setShowSettings] = useState(false);
  const [esp32Ip, setEsp32Ip] = useState(
    localStorage.getItem('esp32_ip') || '192.168.1.100'
  );

  // Check device status on mount
  useEffect(() => {
    checkDeviceStatus();
    const interval = setInterval(checkDeviceStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkDeviceStatus = async () => {
    try {
      const response = await fetch('/api/esp32-status/main');
      if (response.ok) {
        setDeviceStatus('online');
        setError(null);
      } else {
        setDeviceStatus('offline');
      }
    } catch (err) {
      setDeviceStatus('offline');
      setError('Cannot reach ESP32 device');
    }
  };

  const triggerAlert = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/trigger-esp32-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId: 'main',
          duration: parseInt(duration)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger alert');
      }

      const data = await response.json();
      setSuccess(`✅ Alert triggered! Duration: ${duration}ms`);
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('esp32_ip', esp32Ip);
    setSuccess('✅ ESP32 IP settings saved!');
    setTimeout(() => setSuccess(null), 2000);
    setShowSettings(false);
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 border-2 border-red-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">ESP32 Emergency Alert</h2>
            <p className="text-sm text-gray-600">IoT Device Control</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-orange-100 rounded-lg transition"
          title="Settings"
        >
          <Settings className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Device Status */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700">Device Status:</span>
          <div className="flex items-center gap-2">
            {deviceStatus === 'online' ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-green-600 font-semibold">Online</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-600 font-semibold">Offline</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={checkDeviceStatus}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Check Status
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h3 className="font-bold text-gray-800 mb-3">Device Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ESP32 IP Address
              </label>
              <input
                type="text"
                value={esp32Ip}
                onChange={(e) => setEsp32Ip(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Check your ESP32 serial output for the IP address
              </p>
            </div>
            <button
              onClick={saveSettings}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Duration Control */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Alert Duration (ms)
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="100"
            max="10000"
            step="100"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
            {[1000, 3000, 5000].map((val) => (
              <button
                key={val}
                onClick={() => setDuration(val)}
                className={`px-3 py-2 rounded-lg font-medium transition ${
                  duration == val
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {val}ms
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={triggerAlert}
        disabled={loading || deviceStatus === 'offline'}
        className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg transition flex items-center justify-center gap-3 ${
          loading || deviceStatus === 'offline'
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 active:scale-95'
        }`}
      >
        <Zap className="w-6 h-6" />
        {loading ? 'Triggering...' : 'Trigger Alert'}
      </button>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>⚠️ Note:</strong> Make sure your ESP32 is powered on and connected to the same WiFi network. 
          The device IP address can be found in the Serial Monitor during startup.
        </p>
      </div>
    </div>
  );
};

export default ESP32DeviceControl;
