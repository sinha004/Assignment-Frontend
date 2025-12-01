'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function UploadSegment() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [segmentName, setSegmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    
    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    if (!segmentName) {
      setSegmentName(selectedFile.name.replace('.csv', ''));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    if (segmentName) {
      formData.append('name', segmentName);
    }

    try {
      const response = await api.post('/segments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      console.log('Upload response:', response.data);
      const segmentData = response.data.data || response.data;
      setSuccess(
        `Segment uploaded successfully! ${segmentData.totalRecords} records found.`
      );
      setFile(null);
      setSegmentName('');
      setUploadProgress(0);

      // Redirect to segments list after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/segments');
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.message || 'Failed to upload segment. Please try again.'
      );
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#526bb0] hover:text-[#041d36] mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-[#041d36] mb-2">
            Upload Customer Segment
          </h1>
          <p className="text-gray-600">
            Upload a CSV file containing your target customer list
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Segment Name */}
            <div>
              <label className="block text-[#041d36] font-semibold mb-2">
                Segment Name
              </label>
              <input
                type="text"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                placeholder="e.g., Tech Startup Founders"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#526bb0] focus:outline-none text-[#041d36] placeholder:text-gray-400"
              />
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-[#041d36] font-semibold mb-2">
                CSV File <span className="text-red-500">*</span>
              </label>
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-3 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging
                    ? 'border-[#526bb0] bg-[#cad6ec]/30'
                    : 'border-gray-300 hover:border-[#526bb0]'
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer block"
                >
                  <div className="mb-4">
                    <svg
                      className="mx-auto h-16 w-16 text-[#526bb0]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  
                  {file ? (
                    <div className="text-[#041d36]">
                      <p className="font-semibold">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                        className="mt-2 text-[#e51a3a] hover:underline"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[#041d36] font-semibold mb-1">
                        Drop your CSV file here, or click to browse
                      </p>
                      <p className="text-sm text-gray-500">
                        Maximum file size: 10MB
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Required columns: name, email
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#041d36]">Uploading...</span>
                  <span className="text-[#526bb0] font-semibold">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white py-4 rounded-lg font-semibold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Segment'}
            </button>
          </form>
        </div>

        {/* CSV Format Guide */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-[#041d36] mb-4">
            CSV Format Requirements
          </h3>
          <div className="space-y-3 text-gray-700">
            <p>Your CSV file must include these columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>name</strong> - Customer name (required)
              </li>
              <li>
                <strong>email</strong> - Email address (required, must be valid format)
              </li>
              <li>Additional columns (company, phone, etc.) are optional</li>
            </ul>
            
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Example CSV:</p>
              <pre className="text-xs text-gray-600 overflow-x-auto">
{`name,email,company,phone
John Doe,john@example.com,Acme Inc,+1234567890
Jane Smith,jane@example.com,Tech Corp,+0987654321`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
