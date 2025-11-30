'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import {
  Play,
  Mail,
  Clock,
  GitBranch,
  Database,
  FileSpreadsheet,
  Globe,
  Save,
  Upload,
  ArrowLeft,
  Trash2,
  Settings,
  X,
  Code,
  Copy,
  Check,
} from 'lucide-react';

// Custom Node Components
const nodeStyles = {
  trigger: 'bg-green-50 border-green-500',
  sendEmail: 'bg-blue-50 border-blue-500',
  wait: 'bg-yellow-50 border-yellow-500',
  condition: 'bg-purple-50 border-purple-500',
  getSegmentData: 'bg-cyan-50 border-cyan-500',
  parseCSV: 'bg-orange-50 border-orange-500',
  httpRequest: 'bg-red-50 border-red-500',
  code: 'bg-gray-50 border-gray-700',
};

const nodeIcons = {
  trigger: Play,
  sendEmail: Mail,
  wait: Clock,
  condition: GitBranch,
  getSegmentData: Database,
  parseCSV: FileSpreadsheet,
  httpRequest: Globe,
  code: Code,
};

// Base custom node component with handles
function CustomNode({ data, type, selected }) {
  const Icon = nodeIcons[type] || Play;
  const style = nodeStyles[type] || 'bg-gray-50 border-gray-500';
  const isCondition = type === 'condition';
  const isTrigger = type === 'trigger';

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[180px] ${style} ${
        selected ? 'ring-2 ring-[#526bb0] ring-offset-2' : ''
      }`}
    >
      {/* Input handle - not shown for trigger nodes */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}
      
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-black" />
        <span className="font-medium text-sm text-black">{data.label || type}</span>
      </div>
      {data.description && (
        <p className="text-xs text-black mt-1 truncate">{data.description}</p>
      )}

      {/* Output handles */}
      {isCondition ? (
        <>
          {/* True branch */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white !left-1/3"
            style={{ left: '30%' }}
          />
          {/* False branch */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
            style={{ left: '70%' }}
          />
          <div className="flex justify-between text-xs mt-2 px-2">
            <span className="text-green-600">True</span>
            <span className="text-red-600">False</span>
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}
    </div>
  );
}

// Create node type components
const TriggerNode = (props) => <CustomNode {...props} type="trigger" />;
const SendEmailNode = (props) => <CustomNode {...props} type="sendEmail" />;
const WaitNode = (props) => <CustomNode {...props} type="wait" />;
const ConditionNode = (props) => <CustomNode {...props} type="condition" />;
const GetSegmentDataNode = (props) => <CustomNode {...props} type="getSegmentData" />;
const ParseCSVNode = (props) => <CustomNode {...props} type="parseCSV" />;
const HTTPRequestNode = (props) => <CustomNode {...props} type="httpRequest" />;
const CodeNode = (props) => <CustomNode {...props} type="code" />;

const nodeTypes = {
  trigger: TriggerNode,
  sendEmail: SendEmailNode,
  wait: WaitNode,
  condition: ConditionNode,
  getSegmentData: GetSegmentDataNode,
  parseCSV: ParseCSVNode,
  httpRequest: HTTPRequestNode,
  code: CodeNode,
};

// Node palette configuration
const nodeCategories = [
  {
    name: 'Triggers',
    nodes: [
      { type: 'trigger', label: 'Webhook Trigger', description: 'Start workflow with webhook' },
    ],
  },
  {
    name: 'Actions',
    nodes: [
      { type: 'sendEmail', label: 'Send Email', description: 'Send email to recipient' },
      { type: 'httpRequest', label: 'HTTP Request', description: 'Make API calls' },
    ],
  },
  {
    name: 'Logic',
    nodes: [
      { type: 'wait', label: 'Wait', description: 'Delay execution' },
      { type: 'condition', label: 'Condition', description: 'Branch logic' },
      { type: 'code', label: 'Code', description: 'Run JavaScript code' },
    ],
  },
];

// Node property schemas
const nodePropertySchemas = {
  trigger: {
    fields: [
      { name: 'webhookPath', label: 'Webhook Path (auto-generated)', type: 'readonly' },
      { name: 'httpMethod', label: 'HTTP Method', type: 'select', options: ['POST', 'GET'], defaultValue: 'POST' },
    ],
  },
  sendEmail: {
    fields: [
      { name: 'to', label: 'To', type: 'text', placeholder: '{{email}}' },
      { name: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject' },
      { name: 'body', label: 'Body', type: 'textarea', placeholder: 'Email content...' },
    ],
  },
  wait: {
    fields: [
      { name: 'amount', label: 'Duration', type: 'number', placeholder: '1' },
      { name: 'unit', label: 'Unit', type: 'select', options: ['seconds', 'minutes', 'hours', 'days'] },
    ],
  },
  condition: {
    fields: [
      { name: 'field', label: 'Field', type: 'text', placeholder: '{{hasReply}}' },
      { name: 'operator', label: 'Operator', type: 'select', options: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan'] },
      { name: 'value', label: 'Value', type: 'text', placeholder: 'value to compare' },
    ],
  },
  getSegmentData: {
    fields: [
      { name: 'bucket', label: 'S3 Bucket', type: 'text', placeholder: 'bucket-name' },
      { name: 'key', label: 'S3 Key', type: 'text', placeholder: 'path/to/file.csv' },
    ],
  },
  parseCSV: {
    fields: [
      { name: 'delimiter', label: 'Delimiter', type: 'text', placeholder: ',' },
      { name: 'hasHeader', label: 'Has Header Row', type: 'checkbox' },
    ],
  },
  httpRequest: {
    fields: [
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com' },
      { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
      { name: 'body', label: 'Body', type: 'textarea', placeholder: '{"key": "value"}' },
    ],
  },
  code: {
    fields: [
      { name: 'jsCode', label: 'JavaScript Code', type: 'code', placeholder: `// Access input data with $input.all() or $input.first()
// Example: Check if email was replied
const items = $input.all();
const labelIds = items[0].json.labelIds || [];

// Check if INBOX label exists (means reply received)
const hasReply = labelIds.some(label => label === 'INBOX');

// Return data for next node
return items.map(item => ({
  json: { ...item.json, hasReply }
}));` },
    ],
  },
};

// Webhook URL Field with Copy Button
function WebhookUrlField({ label, url }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div>
      <p className="text-xs text-blue-600 font-medium">{label}:</p>
      <div className="flex items-center gap-1 mt-1">
        <p className="flex-1 text-xs text-blue-900 break-all font-mono bg-white px-2 py-1 rounded border border-blue-100">
          {url}
        </p>
        <button
          onClick={handleCopy}
          className="p-1.5 bg-white hover:bg-blue-100 rounded border border-blue-200 transition-colors flex-shrink-0"
          title={copied ? 'Copied!' : 'Copy URL'}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-blue-600" />
          )}
        </button>
      </div>
    </div>
  );
}

// Property Editor Panel
function PropertyEditor({ selectedNode, onUpdate, onClose }) {
  const [properties, setProperties] = useState(selectedNode?.data?.properties || {});
  const [label, setLabel] = useState(selectedNode?.data?.label || '');
  
  useEffect(() => {
    setProperties(selectedNode?.data?.properties || {});
    setLabel(selectedNode?.data?.label || '');
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 flex-shrink-0 h-full">
        <div className="text-center text-gray-500 py-8">
          <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a node to edit its properties</p>
        </div>
      </div>
    );
  }

  const schema = nodePropertySchemas[selectedNode.type] || { fields: [] };

  const handleChange = (fieldName, value) => {
    setProperties((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = () => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      label,
      properties,
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 h-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
        <h3 className="font-semibold text-[#041d36]">Node Properties</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Node Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Node Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#526bb0] focus:border-transparent text-gray-900 placeholder:text-gray-600"
            placeholder="Enter node label"
          />
        </div>

        {/* Webhook URLs for trigger nodes */}
        {selectedNode.type === 'trigger' && properties.webhookPath && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-800">Webhook URLs (after deployment):</p>
            <WebhookUrlField 
              label="Test URL" 
              url={`http://localhost:5678/webhook-test/${properties.webhookPath}`} 
            />
            <WebhookUrlField 
              label="Production URL" 
              url={`http://localhost:5678/webhook/${properties.webhookPath}`} 
            />
          </div>
        )}

        {/* Dynamic Fields */}
        {schema.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            
            {field.type === 'text' && (
              <input
                type="text"
                value={properties[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#526bb0] focus:border-transparent text-gray-900 placeholder:text-gray-600"
              />
            )}
            
            {field.type === 'number' && (
              <input
                type="number"
                value={properties[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#526bb0] focus:border-transparent text-gray-900 placeholder:text-gray-600"
              />
            )}
            
            {field.type === 'textarea' && (
              <textarea
                value={properties[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#526bb0] focus:border-transparent text-gray-900 placeholder:text-gray-600"
              />
            )}
            
            {field.type === 'select' && (
              <select
                value={properties[field.name] || field.options[0]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#526bb0] focus:border-transparent text-gray-900"
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt} className="text-gray-900">{opt}</option>
                ))}
              </select>
            )}
            
            {field.type === 'checkbox' && (
              <input
                type="checkbox"
                checked={properties[field.name] || false}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                className="w-5 h-5 text-[#526bb0] border-gray-300 rounded focus:ring-[#526bb0]"
              />
            )}
            
            {field.type === 'code' && (
              <textarea
                value={properties[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#526bb0] focus:border-transparent text-gray-900 placeholder:text-gray-600 font-mono text-sm bg-gray-50"
                spellCheck={false}
              />
            )}
            
            {field.type === 'readonly' && (
              <input
                type="text"
                value={properties[field.name] || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
              />
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}

// Node Palette Sidebar
function NodePalette({ onDragStart }) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-[#041d36]">Node Types</h3>
        <p className="text-xs text-gray-700 mt-1">Drag nodes to the canvas</p>
      </div>
      
      {nodeCategories.map((category) => (
        <div key={category.name} className="p-4 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
            {category.name}
          </h4>
          <div className="space-y-2">
            {category.nodes.map((node) => {
              const Icon = nodeIcons[node.type];
              const style = nodeStyles[node.type];
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                  className={`p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing ${style} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-black" />
                    <span className="text-sm font-medium text-black">{node.label}</span>
                  </div>
                  <p className="text-xs text-black mt-1">{node.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Flow Builder Canvas
function FlowBuilderCanvas({ campaignId, initialFlow, onSave, onDeploy }) {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow?.edges || []);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPropertyEditor, setShowPropertyEditor] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  // Handle connections between nodes
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowPropertyEditor(true);
  }, []);

  // Handle drag start for palette items
  const onDragStart = useCallback((event, nodeData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drop from palette
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      const nodeData = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Set default properties based on node type
      let defaultProperties = {};
      if (nodeData.type === 'trigger') {
        defaultProperties = {
          webhookPath: `campaign-${campaignId}`,
          httpMethod: 'POST',
        };
      } else if (nodeData.type === 'wait') {
        defaultProperties = {
          amount: '1',
          unit: 'minutes',
        };
      }

      const newNode = {
        id: uuidv4(),
        type: nodeData.type,
        position,
        data: {
          label: nodeData.label,
          description: nodeData.description,
          properties: defaultProperties,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes, campaignId]
  );

  // Update node data
  const updateNodeData = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: newData }
            : node
        )
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: newData } : prev
      );
    },
    [setNodes]
  );

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
      setShowPropertyEditor(false);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Save flow
  const handleSave = async () => {
    const flowData = { nodes, edges };
    await onSave(flowData);
  };

  // Deploy flow
  const handleDeploy = async () => {
    const flowData = { nodes, edges };
    await onDeploy(flowData);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Node Palette */}
      <NodePalette onDragStart={onDragStart} />

      {/* Canvas */}
      <div className="flex-1 relative min-w-0" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          className="bg-gray-100"
        >
          <Background variant="dots" gap={16} size={1} color="#d1d5db" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const colors = {
                trigger: '#10B981',
                sendEmail: '#3B82F6',
                wait: '#F59E0B',
                condition: '#8B5CF6',
                getSegmentData: '#06B6D4',
                parseCSV: '#F97316',
                httpRequest: '#EF4444',
                code: '#374151',
              };
              return colors[node.type] || '#6B7280';
            }}
          />
        </ReactFlow>

        {/* Toolbar */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          {selectedNode && (
            <button
              onClick={deleteSelectedNode}
              className="bg-white px-4 py-2 rounded-lg shadow-md hover:bg-red-50 flex items-center gap-2 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            className="bg-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleDeploy}
            className="bg-gradient-to-r from-[#526bb0] to-[#01adbd] text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Deploy to n8n
          </button>
        </div>
      </div>

      {/* Property Editor */}
      {showPropertyEditor && (
        <PropertyEditor
          selectedNode={selectedNode}
          onUpdate={updateNodeData}
          onClose={() => {
            setShowPropertyEditor(false);
            setSelectedNode(null);
          }}
        />
      )}
    </div>
  );
}

// Main Page Component
export default function FlowBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchCampaignAndFlow();
  }, [isAuthenticated, authLoading, router, params.id]);

  const fetchCampaignAndFlow = async () => {
    try {
      const [campaignRes, flowRes] = await Promise.all([
        api.get(`/campaigns/${params.id}`),
        api.get(`/campaigns/${params.id}/flow`),
      ]);
      setCampaign(campaignRes.data);
      setFlowData(flowRes.data.flowData || { nodes: [], edges: [] });
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load campaign');
      setLoading(false);
    }
  };

  const handleSaveFlow = async (flowData) => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/campaigns/${params.id}/flow`, { flowData });
      setSuccessMessage('Flow saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  const handleDeployFlow = async (flowData) => {
    setSaving(true);
    setError(null);
    try {
      // First save the flow
      await api.patch(`/campaigns/${params.id}/flow`, { flowData });
      
      // Then deploy to n8n
      const response = await api.post(`/campaigns/${params.id}/deploy-flow`);
      const webhookUrl = response.data.webhookUrl || '';
      setSuccessMessage(
        `Flow deployed and activated! Workflow ID: ${response.data.n8nWorkflowId}` +
        (webhookUrl ? `\nWebhook URL: ${webhookUrl}` : '')
      );
      setTimeout(() => setSuccessMessage(null), 8000);
      
      // Refresh campaign data
      await fetchCampaignAndFlow();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deploy flow');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#526bb0] mx-auto mb-4"></div>
          <p className="text-[#041d36] font-semibold">Loading flow builder...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cad6ec] via-white to-[#5fcde0] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-700 text-lg">{error}</p>
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

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/campaigns/${params.id}`)}
            className="text-gray-600 hover:text-[#526bb0] flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-lg font-bold text-[#041d36]">
              Flow Builder: {campaign?.name}
            </h1>
            <p className="text-sm text-gray-600">
              Design your campaign automation workflow
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {campaign?.n8nWorkflowId && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              ✓ Deployed to n8n
            </span>
          )}
          {saving && (
            <span className="text-sm text-gray-700 font-medium">Saving...</span>
          )}
        </div>
      </div>

      {/* Messages */}
      {(error || successMessage) && (
        <div className={`px-6 py-3 flex-shrink-0 ${error ? 'bg-red-100' : 'bg-green-100'}`}>
          <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>
            {error || successMessage}
          </p>
        </div>
      )}

      {/* Flow Builder */}
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <FlowBuilderCanvas
            campaignId={params.id}
            initialFlow={flowData}
            onSave={handleSaveFlow}
            onDeploy={handleDeployFlow}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
