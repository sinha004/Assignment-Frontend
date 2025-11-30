'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // New states for workflow features
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [n8nConnected, setN8nConnected] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchCampaign();
  }, [isAuthenticated, authLoading, router, params.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStatusDropdown && !event.target.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusDropdown]);

  const fetchCampaign = async () => {
    try {
      const response = await api.get(`/campaigns/${params.id}`);
      setCampaign(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load campaign');
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
      return;
    }

    setStatusLoading(true);
    try {
      await api.patch(`/campaigns/${params.id}/status`, { status: newStatus });
      await fetchCampaign();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      running: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-purple-100 text-purple-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getAvailableStatusTransitions = (currentStatus) => {
    const transitions = {
      draft: ['scheduled'],
      scheduled: ['running', 'draft'],
      running: ['paused', 'completed', 'failed'],
      paused: ['running', 'failed'],
      completed: [],
      failed: ['draft'],
    };
    return transitions[currentStatus] || [];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fetch workflow status and execution history
  const fetchWorkflowStatus = async () => {
    setWorkflowLoading(true);
    try {
      const response = await api.get(`/campaigns/${params.id}/workflow-status`);
      setWorkflowStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch workflow status:', err);
      setWorkflowStatus({ error: err.response?.data?.message || 'Failed to fetch status' });
    } finally {
      setWorkflowLoading(false);
    }
  };

  // Trigger workflow execution
  const handleTriggerWorkflow = async () => {
    if (!confirm('This will trigger the workflow immediately. Continue?')) {
      return;
    }

    setTriggerLoading(true);
    setActionMessage(null);
    try {
      const response = await api.post(`/campaigns/${params.id}/trigger-workflow`);
      setActionMessage({ type: 'success', text: 'Workflow triggered successfully!' });
      // Refresh workflow status after triggering
      await fetchWorkflowStatus();
    } catch (err) {
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to trigger workflow' 
      });
    } finally {
      setTriggerLoading(false);
      // Clear message after 5 seconds
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Test n8n connection
  const testN8nConnection = async () => {
    try {
      const response = await api.get('/campaigns/n8n/test-connection');
      setN8nConnected(response.data.connected);
    } catch (err) {
      setN8nConnected(false);
    }
  };

  // Fetch workflow status when flow tab is active
  useEffect(() => {
    if (activeTab === 'flow' && campaign?.n8nWorkflowId) {
      fetchWorkflowStatus();
      testN8nConnection();
    } else if (activeTab === 'flow') {
      // Still check n8n connection even without a deployed workflow
      testN8nConnection();
    }
  }, [activeTab, campaign?.n8nWorkflowId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#526bb0] mx-auto mb-4"></div>
          <p className="text-[#041d36] font-semibold">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-700 text-lg">{error || 'Campaign not found'}</p>
            <button
              onClick={() => router.push('/dashboard/campaigns')}
              className="mt-4 text-[#526bb0] hover:text-[#041d36]"
            >
              ← Back to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableTransitions = getAvailableStatusTransitions(campaign.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/campaigns')}
            className="text-[#526bb0] hover:text-[#041d36] mb-4 flex items-center gap-2"
          >
            ← Back to Campaigns
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-[#041d36]">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-gray-600 mt-2">{campaign.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full font-semibold ${getStatusBadgeColor(campaign.status)}`}>
                {campaign.status.toUpperCase()}
              </span>
              {availableTransitions.length > 0 && (
                <div className="relative status-dropdown-container">
                  <button
                    disabled={statusLoading}
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white px-4 py-2 rounded-lg font-semibold hover:shadow-xl transition-all disabled:bg-gray-400 disabled:opacity-50 flex items-center gap-2"
                  >
                    Change Status
                    <svg className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                      {availableTransitions.map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            handleStatusChange(status);
                            setShowStatusDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-[#041d36] first:rounded-t-lg last:rounded-b-lg transition-colors"
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-[#526bb0] text-[#526bb0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'flow'
                  ? 'border-[#526bb0] text-[#526bb0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Flow Builder
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-[#526bb0] text-[#526bb0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#526bb0]">
                <div className="text-sm text-gray-600 mb-1">Users Targeted</div>
                <div className="text-3xl font-bold text-[#041d36]">{campaign.totalUsersTargeted.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 mb-1">Jobs Created</div>
                <div className="text-3xl font-bold text-[#041d36]">{campaign.totalJobsCreated.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="text-sm text-gray-600 mb-1">Messages Sent</div>
                <div className="text-3xl font-bold text-[#041d36]">{campaign.totalSent.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                <div className="text-sm text-gray-600 mb-1">Failed</div>
                <div className="text-3xl font-bold text-[#041d36]">{campaign.totalFailed.toLocaleString()}</div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-[#041d36] mb-4">Campaign Details</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Campaign ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{campaign.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.updatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">End Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.endDate)}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-[#041d36] mb-4">Target Segment</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Segment Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{campaign.segment?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Contacts</dt>
                    <dd className="mt-1 text-sm text-gray-900">{campaign.segment?.totalRecords.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">File Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{campaign.segment?.fileName}</dd>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => router.push(`/dashboard/segments/${campaign.segmentId}`)}
                      className="text-[#526bb0] hover:text-[#01adbd] text-sm font-medium"
                    >
                      View Segment Details →
                    </button>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="space-y-6">
            {/* Action Message */}
            {actionMessage && (
              <div className={`rounded-lg p-4 ${
                actionMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {actionMessage.text}
              </div>
            )}

            {/* n8n Connection Status */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    n8nConnected === null ? 'bg-gray-300 animate-pulse' :
                    n8nConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">
                    n8n Automation Engine: {
                      n8nConnected === null ? 'Checking...' :
                      n8nConnected ? 'Connected' : 'Disconnected'
                    }
                  </span>
                </div>
                <button
                  onClick={testN8nConnection}
                  className="text-sm text-[#526bb0] hover:text-[#01adbd]"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Main Flow Card */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🔄</div>
                <h3 className="text-xl font-semibold text-[#041d36] mb-2">Flow Builder</h3>
                <p className="text-gray-600 mb-6">
                  Create visual workflows to automate your campaign
                </p>
                
                {/* Flow Status */}
                {campaign.flowData && Object.keys(campaign.flowData).length > 0 ? (
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                      ✓ Flow configured ({campaign.flowData.nodes?.length || 0} nodes)
                    </span>
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
                      No flow configured yet
                    </span>
                  </div>
                )}

                {/* n8n Deployment Status */}
                {campaign.n8nWorkflowId && (
                  <div className="mb-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                      🚀 Deployed to n8n (ID: {campaign.n8nWorkflowId})
                    </span>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => router.push(`/dashboard/campaigns/${params.id}/flow-builder`)}
                    className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-xl transition-all inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    {campaign.flowData ? 'Edit Flow' : 'Create Flow'}
                  </button>

                  {/* Run Now Button - only show if workflow is deployed */}
                  {campaign.n8nWorkflowId && (
                    <button
                      onClick={handleTriggerWorkflow}
                      disabled={triggerLoading}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-xl transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {triggerLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                          Running...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Run Now
                        </>
                      )}
                    </button>
                  )}

                  {/* Refresh Status Button */}
                  {campaign.n8nWorkflowId && (
                    <button
                      onClick={fetchWorkflowStatus}
                      disabled={workflowLoading}
                      className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <svg className={`w-5 h-5 ${workflowLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Status
                    </button>
                  )}
                </div>

                {/* Flow Features */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto text-left">
                  <h4 className="font-medium text-blue-900 mb-2">✨ Flow Builder Features</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Drag-and-drop workflow designer</li>
                    <li>Pre-built nodes for email, delays, and conditions</li>
                    <li>Visual branching based on customer data</li>
                    <li>One-click deployment to n8n</li>
                    <li>Real-time workflow validation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Workflow Status & Execution History */}
            {campaign.n8nWorkflowId && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-[#041d36] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Workflow Status & Execution History
                </h3>

                {workflowLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#526bb0]"></div>
                    <span className="ml-3 text-gray-600">Loading status...</span>
                  </div>
                ) : workflowStatus?.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {workflowStatus.error}
                  </div>
                ) : workflowStatus ? (
                  <div className="space-y-4">
                    {/* Workflow Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="text-sm font-medium text-gray-600 mb-1">Workflow Status</div>
                        <div className="text-lg font-bold flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${
                            workflowStatus.isDeployed ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className={workflowStatus.isDeployed ? 'text-green-700' : 'text-gray-700'}>
                            {workflowStatus.isDeployed ? 'Deployed' : 'Not Deployed'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="text-sm font-medium text-gray-600 mb-1">n8n Workflow ID</div>
                        <div className="text-lg font-bold font-mono text-[#526bb0]">
                          {workflowStatus.n8nWorkflowId || '-'}
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="text-sm font-medium text-gray-600 mb-1">Total Executions</div>
                        <div className="text-lg font-bold text-[#041d36]">
                          {workflowStatus.executions?.length || 0}
                        </div>
                      </div>
                    </div>

                    {/* Execution History Table */}
                    {workflowStatus.executions && workflowStatus.executions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Execution ID
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Started At
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Finished At
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Mode
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {workflowStatus.executions.slice(0, 10).map((execution, index) => (
                              <tr key={execution.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-[#526bb0]">
                                  {execution.id}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    execution.status === 'success' || execution.finished
                                      ? 'bg-green-100 text-green-800'
                                      : execution.status === 'error' || execution.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : execution.status === 'running'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {execution.status || (execution.finished ? 'success' : 'unknown')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                                  {execution.startedAt ? formatDate(execution.startedAt) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                                  {execution.stoppedAt ? formatDate(execution.stoppedAt) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                                  {execution.mode || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {workflowStatus.executions.length > 10 && (
                          <p className="text-sm text-gray-500 text-center py-2">
                            Showing 10 of {workflowStatus.executions.length} executions
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-600">No executions yet. Click "Run Now" to trigger the workflow.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">Click "Refresh Status" to load workflow information</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-semibold text-[#041d36] mb-6">Campaign Performance</h3>
            
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                <div className="text-sm text-green-700 mb-1">Delivery Rate</div>
                <div className="text-3xl font-bold text-green-900">
                  {campaign.totalSent + campaign.totalFailed > 0
                    ? ((campaign.totalSent / (campaign.totalSent + campaign.totalFailed)) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <div className="text-sm text-blue-700 mb-1">Success Rate</div>
                <div className="text-3xl font-bold text-blue-900">
                  {campaign.totalUsersTargeted > 0
                    ? ((campaign.totalSent / campaign.totalUsersTargeted) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
                <div className="text-sm text-red-700 mb-1">Failure Rate</div>
                <div className="text-3xl font-bold text-red-900">
                  {campaign.totalSent + campaign.totalFailed > 0
                    ? ((campaign.totalFailed / (campaign.totalSent + campaign.totalFailed)) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>

            {/* Additional Analytics Placeholder */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="font-semibold text-gray-900 mb-2">Advanced Analytics</h4>
              <p className="text-gray-600 text-sm">
                Detailed charts and insights will be displayed here, including:
              </p>
              <ul className="text-sm text-gray-600 mt-3 space-y-1">
                <li>• Message delivery timeline</li>
                <li>• Engagement metrics (opens, clicks, conversions)</li>
                <li>• Device and platform breakdown</li>
                <li>• Geographic distribution</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
