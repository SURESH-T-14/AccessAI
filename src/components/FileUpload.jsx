import React, { useState, useRef } from 'react';
import './FileUpload.css';

const FileUpload = ({ onAnalysisComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileData, setFileData] = useState(null); // Store base64/file data
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'image/gif', 'image/bmp'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const API_BASE = 'http://localhost:5000/api';

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError?.('Invalid file type. Allowed: PDF, Word, PowerPoint, and Images');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError?.('File too large. Maximum size: 50MB');
      return false;
    }
    return true;
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);
    setAnalysis(null);

    try {
      // Store base64/file data for chat
      const base64Data = await readFileAsBase64(file);
      setFileData({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data,
        isImage: file.type.startsWith('image/')
      });

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(JSON.parse(xhr.responseText || '{"error": true, "message": "Upload failed"}'));
          }
        });

        xhr.addEventListener('error', () => {
          reject({ error: true, message: 'Network error during upload' });
        });

        xhr.open('POST', `${API_BASE}/upload-file`);
        xhr.send(formData);
      });

      if (response.error) {
        onError?.(response.message || 'Upload failed');
        return;
      }

      setAnalysis(response.data);
      
      // Ensure all file data is properly passed to chat
      const completeFileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data,
        isImage: file.type.startsWith('image/'),
        extractedText: response.data.extracted_text // Add extracted text
      };
      
      const completeData = {
        ...response.data,
        fileData: completeFileData
      };
      
      onAnalysisComplete?.(completeData);
      
      // Show success message
      console.log('✅ File analyzed successfully:', response.data);
    } catch (error) {
      const errorMessage = error.message || 'Failed to upload file';
      onError?.(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'pptx':
        return '🎯';
      default:
        return fileType.includes('image') ? '🖼️' : '📦';
    }
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload-header">
        <h3>📤 Upload & Analyze Files</h3>
        <p className="upload-info">PDF, Word, PowerPoint, Images (Max: 50MB)</p>
      </div>

      <div
        className={`file-upload-area ${dragActive ? 'active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleChange}
          disabled={isUploading}
          accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.gif,.bmp"
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <div className="upload-progress">
            <div className="spinner"></div>
            <p>Uploading... {uploadProgress}%</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <p className="upload-text">
              Drag & drop your file here or <span className="click-text">click to browse</span>
            </p>
            <p className="upload-subtext">Supports PDF, Word, PowerPoint, and Images</p>
          </div>
        )}
      </div>

      {analysis && (
        <div className="analysis-result">
          <div className="result-header">
            <span className="result-icon">{getFileIcon(analysis.file_type)}</span>
            <div className="result-info">
              <h4>{analysis.filename}</h4>
              <p>{analysis.file_type.toUpperCase()} • {analysis.text_length} characters</p>
            </div>
          </div>

          <div className="result-preview">
            <h5>Content Preview</h5>
            <p>{analysis.extracted_text}</p>
          </div>

          {analysis.analysis && (
            <div className="result-analysis">
              <h5>Analysis Results</h5>
              
              {analysis.analysis.sentiment && (
                <div className="analysis-item">
                  <strong>Sentiment:</strong>
                  <span className={`sentiment-badge ${analysis.analysis.sentiment.label?.toLowerCase()}`}>
                    {analysis.analysis.sentiment.label || 'Unknown'} ({Math.round(analysis.analysis.sentiment.score * 100)}%)
                  </span>
                </div>
              )}

              {analysis.analysis.intent && (
                <div className="analysis-item">
                  <strong>Intent:</strong>
                  <span className="intent-badge">
                    {typeof analysis.analysis.intent === 'object' 
                      ? (analysis.analysis.intent.primary_intent || analysis.analysis.intent.text || JSON.stringify(analysis.analysis.intent)) 
                      : analysis.analysis.intent}
                  </span>
                </div>
              )}

              {analysis.analysis.keywords && Array.isArray(analysis.analysis.keywords) && (
                <div className="analysis-item">
                  <strong>Keywords:</strong>
                  <div className="keywords-list">
                    {analysis.analysis.keywords.slice(0, 5).map((keyword, idx) => (
                      <span key={idx} className="keyword-tag">{keyword}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.analysis.error && (
                <div className="analysis-error">
                  ⚠️ Analysis error: {analysis.analysis.error}
                </div>
              )}
            </div>
          )}

          <button 
            className="use-analysis-btn"
            onClick={() => {
              // Send file to chat with all data
              onAnalysisComplete?.({
                ...analysis,
                fileData: fileData
              });
              setAnalysis(null);
              setFileData(null);
              fileInputRef.current.value = '';
            }}
          >
            Use in Chat
          </button>

          <button 
            className="clear-analysis-btn"
            onClick={() => {
              setAnalysis(null);
              fileInputRef.current.value = '';
            }}
          >
            Clear & Upload New File
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
