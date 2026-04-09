import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';
import {
  clearFlowNodeStates,
  getNodeInternalState,
  setNodeInternalState,
  setCurrentFlowId as setNodeStateFlowId
} from '@/hooks/use-node-state';
import { useToastManager } from '@/hooks/use-toast-manager';
import { flowService } from '@/services/flow-service';
import { Flow } from '@/types/flow';
import { useCallback, useEffect, useState } from 'react';

export interface UseFlowManagementReturn {
  // State
  flows: Flow[];
  searchQuery: string;
  isLoading: boolean;
  openGroups: string[];
  createDialogOpen: boolean;
  
  // Computed values
  filteredFlows: Flow[];
  recentFlows: Flow[];
  templateFlows: Flow[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setOpenGroups: (groups: string[]) => void;
  setCreateDialogOpen: (open: boolean) => void;
  handleAccordionChange: (value: string[]) => void;
  handleCreateNewFlow: () => void;
  handleFlowCreated: (newFlow: Flow) => Promise<void>;
  handleSaveCurrentFlow: () => Promise<void>;
  handleLoadFlow: (flow: Flow) => Promise<void>;
  handleDeleteFlow: (flow: Flow) => Promise<void>;
  handleRefresh: () => Promise<void>;
  
  // Internal functions (for testing/advanced use)
  loadFlows: () => Promise<void>;
  createDefaultFlow: () => Promise<void>;
}

export function useFlowManagement(): UseFlowManagementReturn {
  // Get flow context, node context, and toast manager
  const { saveCurrentFlow, loadFlow, reactFlowInstance, currentFlowId } = useFlowContext();
  const { exportNodeContextData } = useNodeContext();
  const { success, error } = useToastManager();
  
  // State for flows
  const [flows, setFlows] = useState<Flow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['recent-flows']);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Enhanced save function that includes internal node states AND node context data
  const saveCurrentFlowWithStates = useCallback(async (): Promise<Flow | null> => {
    try {
      // Get current nodes from React Flow
      const currentNodes = reactFlowInstance.getNodes();
      
      // Get node context data (runtime data: agent status, messages, output data)
      const flowId = currentFlowId?.toString() || null;
      const nodeContextData = exportNodeContextData(flowId);
      
      // Enhance nodes with internal states
      const nodesWithStates = currentNodes.map((node: any) => {
        const internalState = getNodeInternalState(node.id);
        return {
          ...node,
          data: {
            ...node.data,
            // Only add internal_state if there is actually state to save
            ...(internalState && Object.keys(internalState).length > 0 ? { internal_state: internalState } : {})
          }
        };
      });

      // Temporarily replace nodes in React Flow with enhanced nodes
      reactFlowInstance.setNodes(nodesWithStates);
      
      try {
        // Use the context's save function which handles currentFlowId properly
        const savedFlow = await saveCurrentFlow();
        
        if (savedFlow) {
          // After basic save, update with node context data
          const updatedFlow = await flowService.updateFlow(savedFlow.id, {
            ...savedFlow,
            data: {
              ...savedFlow.data,
              nodeContextData, // Add runtime data from node context
            }
          });
          
          return updatedFlow;
        }
        
        return savedFlow;
      } finally {
        // Restore original nodes (without internal_state in React Flow)
        reactFlowInstance.setNodes(currentNodes);
      }
    } catch (err) {
      console.error('Failed to save flow with states:', err);
      return null;
    }
  }, [reactFlowInstance, saveCurrentFlow, exportNodeContextData, currentFlowId]);

  // Enhanced load function that restores internal node states AND node context data
  const loadFlowWithStates = useCallback(async (flow: Flow) => {
    try {
      // First, set the flow ID for node state isolation
      setNodeStateFlowId(flow.id.toString());
      
      // DO NOT clear configuration state when loading flows - useNodeState handles flow isolation automatically
      // DO NOT reset runtime data when loading flows - preserve all runtime state
      // Runtime data should only be reset when explicitly starting a new run via the Play button
      console.log(`[FlowManagement] Loading flow ${flow.id} (${flow.name}), preserving all state (configuration + runtime)`);

      // Load the flow using the context (this handles currentFlowId, currentFlowName, etc.)
      await loadFlow(flow);

      // Then restore internal states for each node (use-node-state data)
      if (flow.nodes) {
        flow.nodes.forEach((node: any) => {
          if (node.data?.internal_state) {
            setNodeInternalState(node.id, node.data.internal_state);
          }
        });
      }
      
      // NOTE: We intentionally do NOT restore nodeContextData here
      // Runtime execution data (messages, analysis, agent status) should start fresh
      // Only configuration data (tickers, model selections) is restored above

      console.log('Flow loaded with complete state restoration:', flow.name);
    } catch (error) {
      console.error('Failed to load flow with states:', error);
      throw error; // Re-throw to handle in calling function
    }
  }, [loadFlow]);

  // Default flow nodes and edges - loaded fresh every time
  const defaultNodes = [
    {
      id: "portfolio-start-node_default",
      type: "portfolio-start-node",
      position: { x: 0, y: 0 },
      data: { name: "Portfolio Input", description: "Enter your portfolio including tickers, shares, and prices. Connect this node to Analysts to generate insights.", status: "Idle" },
    },
    {
      id: "technical_analyst_default",
      type: "agent-node",
      position: { x: 450, y: -550 },
      data: { name: "Technical Analyst", description: "Analyzes price patterns, trends, and technical indicators.", status: "Idle" },
    },
    {
      id: "fundamentals_analyst_default",
      type: "agent-node",
      position: { x: 450, y: -200 },
      data: { name: "Fundamentals Analyst", description: "Analyzes financial statements, ratios, and company fundamentals.", status: "Idle" },
    },
    {
      id: "sentiment_analyst_default",
      type: "agent-node",
      position: { x: 450, y: 150 },
      data: { name: "Sentiment Analyst", description: "Analyzes market sentiment from news, social media, and other sources.", status: "Idle" },
    },
    {
      id: "valuation_analyst_default",
      type: "agent-node",
      position: { x: 450, y: 500 },
      data: { name: "Valuation Analyst", description: "Analyzes intrinsic value using DCF, comparables, and other valuation methods.", status: "Idle" },
    },
    {
      id: "portfolio_manager_default",
      type: "portfolio-manager-node",
      position: { x: 900, y: 0 },
      data: { name: "Portfolio Manager", description: "Generates investment decisions based on input from Analysts.", status: "Idle" },
    },
  ];

  const defaultEdges = [
    { id: "e1", source: "portfolio-start-node_default", target: "technical_analyst_default" },
    { id: "e2", source: "portfolio-start-node_default", target: "fundamentals_analyst_default" },
    { id: "e3", source: "portfolio-start-node_default", target: "sentiment_analyst_default" },
    { id: "e4", source: "portfolio-start-node_default", target: "valuation_analyst_default" },
    { id: "e5", source: "technical_analyst_default", target: "portfolio_manager_default" },
    { id: "e6", source: "fundamentals_analyst_default", target: "portfolio_manager_default" },
    { id: "e7", source: "sentiment_analyst_default", target: "portfolio_manager_default" },
    { id: "e8", source: "valuation_analyst_default", target: "portfolio_manager_default" },
  ];

  // Create default flow for new users
  const createDefaultFlow = useCallback(async () => {
    try {
      console.log('Loading default flow locally...');
      const localFlow: Flow = {
        id: 1,
        name: 'AI Hedge Fund',
        description: 'Pre-built flow with 4 analysts and a portfolio manager.',
        nodes: defaultNodes,
        edges: defaultEdges,
        viewport: { x: 100, y: 300, zoom: 0.7 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_template: false,
      };
      setFlows([localFlow]);
      setNodeStateFlowId('1');
      reactFlowInstance.setNodes(defaultNodes);
      reactFlowInstance.setEdges(defaultEdges);
      reactFlowInstance.setViewport({ x: 100, y: 300, zoom: 0.7 });
      console.log('Default flow loaded locally');
    } catch (error) {
      console.error('Failed to create default flow:', error);
    }
  }, [reactFlowInstance]);

  // Load flows - always start fresh with default flow
  const loadFlows = useCallback(async () => {
    setIsLoading(true);
    try {
      await createDefaultFlow();
    } catch (error) {
      console.error('Error loading flows:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createDefaultFlow]);

  // Load flows on mount
  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // Filter flows based on search query
  const filteredFlows = flows.filter(flow =>
    flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flow.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort flows by updated_at descending, then group them
  const sortedFlows = [...filteredFlows].sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });

  // Group flows
  const recentFlows = sortedFlows.filter(f => !f.is_template).slice(0, 10);
  const templateFlows = sortedFlows.filter(f => f.is_template);

  // Event handlers
  const handleAccordionChange = useCallback((value: string[]) => {
    setOpenGroups(value);
  }, []);

  const handleCreateNewFlow = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleFlowCreated = useCallback(async (newFlow: Flow) => {
    // Load the new flow and remember it
    await loadFlowWithStates(newFlow);
    localStorage.setItem('lastSelectedFlowId', newFlow.id.toString());
    
    // Refresh the flows list to show the new flow
    await loadFlows();
  }, [loadFlowWithStates, loadFlows]);

  const handleSaveCurrentFlow = useCallback(async () => {
    try {
      const savedFlow = await saveCurrentFlowWithStates();
      if (savedFlow) {
        // Remember the saved flow
        localStorage.setItem('lastSelectedFlowId', savedFlow.id.toString());
        // Refresh the flows list
        await loadFlows();
        success(`"${savedFlow.name}" saved!`, 'flow-save');
      } else {
        error('Failed to save flow', 'flow-save-error');
      }
    } catch (err) {
      console.error('Failed to save flow:', err);
      error('Failed to save flow', 'flow-save-error');
    }
  }, [saveCurrentFlowWithStates, loadFlows, success, error]);

  const handleLoadFlow = useCallback(async (flow: Flow) => {
    try {
      // Fetch the full flow data including nodes, edges, and viewport
      const fullFlow = await flowService.getFlow(flow.id);
      await loadFlowWithStates(fullFlow);
      // Remember the selected flow
      localStorage.setItem('lastSelectedFlowId', flow.id.toString());
      console.log('Flow loaded:', fullFlow.name);
    } catch (error) {
      console.error('Failed to load flow:', error);
    }
  }, [loadFlowWithStates]);

  const handleRefresh = useCallback(async () => {
    await loadFlows();
  }, [loadFlows]);

  const handleDeleteFlow = useCallback(async (flow: Flow) => {
    try {
      await flowService.deleteFlow(flow.id);
      // Clear node states for the deleted flow
      clearFlowNodeStates(flow.id.toString());
      // Remove from localStorage if it was the last selected
      const lastSelectedFlowId = localStorage.getItem('lastSelectedFlowId');
      if (lastSelectedFlowId === flow.id.toString()) {
        localStorage.removeItem('lastSelectedFlowId');
      }
      // Refresh the flows list
      await loadFlows();
    } catch (error) {
      console.error('Failed to delete flow:', error);
    }
  }, [loadFlows]);

  return {
    // State
    flows,
    searchQuery,
    isLoading,
    openGroups,
    createDialogOpen,
    
    // Computed values
    filteredFlows,
    recentFlows,
    templateFlows,
    
    // Actions
    setSearchQuery,
    setOpenGroups,
    setCreateDialogOpen,
    handleAccordionChange,
    handleCreateNewFlow,
    handleFlowCreated,
    handleSaveCurrentFlow,
    handleLoadFlow,
    handleDeleteFlow,
    handleRefresh,
    
    // Internal functions
    loadFlows,
    createDefaultFlow,
  };
} 