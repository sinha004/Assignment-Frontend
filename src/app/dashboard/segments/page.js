'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function SegmentsList() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchSegments();
  }, [isAuthenticated, authLoading, router]);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/segments');
      console.log('Segments API response:', response.data);
      const segmentsData = response.data.data || response.data || [];
      setSegments(Array.isArray(segmentsData) ? segmentsData : []);
    } catch (err) {
      setError('Failed to load segments');
      console.error('Segments fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (segmentId, segmentName) => {
    if (!confirm(`Are you sure you want to delete "${segmentName}"?`)) {
      return;
    }

    try {
      setDeletingId(segmentId);
      await api.delete(`/segments/${segmentId}`);
      
      // Remove from local state
      setSegments(segments.filter((s) => s.id !== segmentId));
      
      // Show success message
      alert('Segment deleted successfully');
    } catch (err) {
      alert('Failed to delete segment. Please try again.');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (segmentId, fileName) => {
    try {
      const response = await api.get(`/segments/${segmentId}/download`);
      const downloadUrl = response.data.data.downloadUrl;
      
      // Open download URL in new tab
      window.open(downloadUrl, '_blank');
    } catch (err) {
      alert('Failed to generate download link. Please try again.');
      console.error(err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#526bb0] mx-auto mb-4"></div>
          <p className="text-[#041d36] font-semibold">Loading segments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-[#526bb0] hover:text-[#041d36] mb-4 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-[#041d36] mb-2">
              Customer Segments
            </h1>
            <p className="text-gray-600">
              Manage your uploaded customer segment lists
            </p>
          </div>
          
          <button
            onClick={() => router.push('/dashboard/segments/upload')}
            className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-xl transition-all flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Upload New Segment
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Segments List */}
        {segments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <svg
              className="mx-auto h-24 w-24 text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-2xl font-bold text-[#041d36] mb-2">
              No segments yet
            </h3>
            <p className="text-gray-600 mb-6">
              Upload your first customer segment to get started
            </p>
            <button
              onClick={() => router.push('/dashboard/segments/upload')}
              className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white px-8 py-3 rounded-lg font-semibold hover:shadow-xl transition-all"
            >
              Upload Segment
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Segment Name</th>
                    <th className="px-6 py-4 text-left font-semibold">File Name</th>
                    <th className="px-6 py-4 text-left font-semibold">Records</th>
                    <th className="px-6 py-4 text-left font-semibold">File Size</th>
                    <th className="px-6 py-4 text-left font-semibold">Uploaded</th>
                    <th className="px-6 py-4 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {segments.map((segment) => (
                    <tr
                      key={segment.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#041d36]">
                          {segment.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-[#526bb0]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          {segment.fileName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#cad6ec] text-[#041d36] px-3 py-1 rounded-full text-sm font-semibold">
                            {segment.totalRecords.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">
                          {formatFileSize(segment.fileSize)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">
                          {formatDate(segment.uploadedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownload(segment.id, segment.fileName)}
                            className="text-[#01adbd] hover:text-[#041d36] p-2 rounded-lg hover:bg-blue-50 transition-all"
                            title="Download CSV"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          </button>

                          <button
                            onClick={() => router.push(`/dashboard/segments/${segment.id}`)}
                            className="text-[#526bb0] hover:text-[#041d36] p-2 rounded-lg hover:bg-gray-100 transition-all"
                            title="View details"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleDelete(segment.id, segment.name)}
                            disabled={deletingId === segment.id}
                            className="text-[#e51a3a] hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                            title="Delete segment"
                          >
                            {deletingId === segment.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-[#e51a3a]"></div>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {segments.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] p-4 rounded-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Segments</p>
                  <p className="text-3xl font-bold text-[#041d36]">{segments.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-[#01adbd] to-[#5fcde0] p-4 rounded-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Contacts</p>
                  <p className="text-3xl font-bold text-[#041d36]">
                    {segments.reduce((sum, s) => sum + s.totalRecords, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-[#5fcde0] to-[#cad6ec] p-4 rounded-lg">
                  <svg
                    className="w-8 h-8 text-white"
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
                <div>
                  <p className="text-gray-600 text-sm">Storage Used</p>
                  <p className="text-3xl font-bold text-[#041d36]">
                    {formatFileSize(segments.reduce((sum, s) => sum + s.fileSize, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
