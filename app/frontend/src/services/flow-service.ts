import { Flow } from '@/types/flow';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface CreateFlowRequest {
  name: string;
  description?: string;
  nodes: any;
  edges: any;
  viewport?: any;
  data?: any;
  is_template?: boolean;
  tags?: string[];
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
  nodes?: any;
  edges?: any;
  viewport?: any;
  data?: any;
  is_template?: boolean;
  tags?: string[];
}

export const flowService = {
  // Get all flows
  async getFlows(): Promise<Flow[]> {
    const response = await fetch(`${API_BASE_URL}/flows/`);
    if (!response.ok) {
      throw new Error('Failed to fetch flows');
    }
    return response.json();
  },

  // Get a specific flow
  async getFlow(id: number): Promise<Flow> {
    const response = await fetch(`${API_BASE_URL}/flows/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch flow');
    }
    return response.json();
  },

  // Create a new flow
  async createFlow(data: CreateFlowRequest): Promise<Flow> {
    const response = await fetch(`${API_BASE_URL}/flows/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create flow');
    }
    return response.json();
  },

  // Update an existing flow
  async updateFlow(id: number, data: UpdateFlowRequest): Promise<Flow> {
    const response = await fetch(`${API_BASE_URL}/flows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update flow');
    }
    return response.json();
  },

  // Delete a flow
  async deleteFlow(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/flows/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete flow');
    }
  },

  // Duplicate a flow
  async duplicateFlow(id: number, newName?: string): Promise<Flow> {
    const url = `${API_BASE_URL}/flows/${id}/duplicate${newName ? `?new_name=${encodeURIComponent(newName)}` : ''}`;
    const response = await fetch(url, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to duplicate flow');
    }
    return response.json();
  },

  // Create a default flow with pre-built nodes and edges
  async createDefaultFlow(_nodes: any, _edges: any, _viewport?: any): Promise<Flow> {
    const defaultNodes = [
      {
        id: "portfolio-start-node_default",
        type: "portfolio-start-node",
        position: { x: 0, y: 0 },
        data: {
          name: "Portfolio Input",
          description: "Enter your portfolio including tickers, shares, and prices. Connect this node to Analysts to generate insights.",
          status: "Idle",
        },
      },
      {
        id: "technical_analyst_default",
        type: "agent-node",
        position: { x: 450, y: -550 },
        data: { name: "Technical Analyst", description: "Analyzes price patterns, trends, and technical indicators to predict future price movements.", status: "Idle" },
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

    return this.createFlow({
      name: 'AI Hedge Fund',
      description: 'Pre-built flow with 4 analysts and a portfolio manager. Enter tickers and hit Run.',
      nodes: defaultNodes,
      edges: defaultEdges,
      viewport: { x: 100, y: 300, zoom: 0.7 },
    });
  },
}; 