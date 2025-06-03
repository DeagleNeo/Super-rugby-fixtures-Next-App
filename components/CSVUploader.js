import { useState, useRef } from 'react';

const CSVUploader = ({ onUploadSuccess }) => {
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const generateChecksum = async (buffer) => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const validateFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Please select a CSV file');
    }
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File size must be less than 100MB');
    }
    return true;
  };

  const uploadFile = async (file) => {
    try {
      // Validate file first
      validateFile(file);

      // Initialize upload
      const initResponse = await fetch('/api/upload/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.error);
      }

      const { uploadId, chunkSize, totalChunks } = await initResponse.json();
      
      setUploadProgress({
        uploadId,
        progress: 0,
        status: 'uploading',
      });

      abortControllerRef.current = new AbortController();

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        if (isPaused) {
          setUploadProgress(prev => ({ ...prev, status: 'paused' }));
          return;
        }

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const arrayBuffer = await chunk.arrayBuffer();
        const checksum = await generateChecksum(arrayBuffer);
        
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', i.toString());
        formData.append('checksum', checksum);
        formData.append('chunk', new Blob([arrayBuffer]));

        const chunkResponse = await fetch('/api/upload/chunk', {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        if (!chunkResponse.ok) {
          const error = await chunkResponse.json();
          throw new Error(error.error);
        }

        const { progress } = await chunkResponse.json();
        setUploadProgress(prev => ({ ...prev, progress }));
      }

      // Finalize upload
      setUploadProgress(prev => ({ ...prev, status: 'processing' }));
      
      const finalizeResponse = await fetch('/api/upload/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({uploadId}),
      });

      if (!finalizeResponse.ok) {
        const error = await finalizeResponse.json();
        throw new Error(error.error);
      }

      const result = await finalizeResponse.json();
      setUploadProgress(null);
      
      if (onUploadSuccess) {
        onUploadSuccess({
          success: true,
          message: `Success! Uploaded ${result.inserted} fixtures`,
          sample: result.sample
        });
      }
    } catch (error) {
      setUploadProgress(prev => 
        prev ? { ...prev, status: 'error', error: error.message } : null
      );
      
      if (onUploadSuccess) {
        onUploadSuccess({
          success: false,
          message: `Upload failed: ${error.message}`
        });
      }
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file);
      uploadFile(file);
    } catch (error) {
      if (onUploadSuccess) {
        onUploadSuccess({
          success: false,
          message: error.message
        });
      }
    }
  };

  // Drag and Drop Event Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragOver to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      try {
        validateFile(file);
        uploadFile(file);
      } catch (error) {
        if (onUploadSuccess) {
          onUploadSuccess({
            success: false,
            message: error.message
          });
        }
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      // Resume upload
      if (fileInputRef.current?.files?.[0]) {
        uploadFile(fileInputRef.current.files[0]);
      }
    } else {
      setIsPaused(true);
      abortControllerRef.current?.abort();
    }
  };

  const cancelUpload = async () => {
    if (uploadProgress?.uploadId) {
      await fetch('/api/upload/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: uploadProgress.uploadId }),
      });
    }
    
    setUploadProgress(null);
    setIsPaused(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploading = uploadProgress?.status === 'uploading' || uploadProgress?.status === 'processing';

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : isUploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        } ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!isUploading ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 flex items-center justify-center">
            {isDragOver ? (
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          
          <div>
            <p className={`text-lg font-medium ${isDragOver ? 'text-blue-600' : 'text-gray-700'}`}>
              {isDragOver ? 'Drop your CSV file here' : 'Drop your CSV file here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports CSV files up to 100MB
            </p>
          </div>
          
          {!isDragOver && !isUploading && (
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              onClick={handleBrowseClick}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Browse Files
            </button>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex justify-between items-center mb-2">
            <span className={`font-medium ${
              uploadProgress.status === 'error' ? 'text-red-600' : 'text-gray-700'
            }`}>
              {uploadProgress.status === 'uploading' && '📤 Uploading...'}
              {uploadProgress.status === 'processing' && '🔍 Scanning file...'}
              {uploadProgress.status === 'paused' && '⏸️ Upload paused'}
              {uploadProgress.status === 'error' && '❌ Upload failed'}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(uploadProgress.progress)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                uploadProgress.status === 'error' ? 'bg-red-500' :
                uploadProgress.status === 'processing' ? 'bg-yellow-500' :
                uploadProgress.status === 'paused' ? 'bg-gray-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>

          {uploadProgress.error && (
            <p className="text-red-500 text-sm mt-2">{uploadProgress.error}</p>
          )}

          <div className="flex gap-2 mt-4">
            {(uploadProgress.status === 'uploading' || uploadProgress.status === 'paused') && (
              <>
                <button
                  onClick={togglePause}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition flex items-center gap-2"
                >
                  {isPaused ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={cancelUpload}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Security Features */}
      <div className="mt-4 text-sm text-gray-600">
        <h3 className="font-semibold mb-2 flex items-center gap-2">Security Features:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Multi-layered malware scanning</li>
          <li>Chunk integrity verification</li>
          <li>Pattern-based threat detection</li>
          <li>ClamAV integration</li>
          <li>VirusTotal API checks</li>
        </ul>
      </div>
    </div>
  );
};

export default CSVUploader;