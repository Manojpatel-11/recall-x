import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  async createExperiment(data: ExperimentCreate) {
    const response = await this.client.post<ExperimentResponse>('/experiments', data);
    return response.data;
  }

  async listExperiments(limit = 50, offset = 0) {
    const response = await this.client.get<ExperimentListResponse>(`/experiments?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async getExperiment(id: string) {
    const response = await this.client.get<ExperimentResponse>(`/experiments/${id}`);
    return response.data;
  }

  async runPreflight(data: PreflightRequest) {
    const response = await this.client.post<PreflightResponse>('/preflight', data);
    return response.data;
  }

  async recallMemory(data: RecallRequest) {
    const response = await this.client.post<RecallResponse>('/recall', data);
    return response.data;
  }

  async askMemory(question: string) {
    const response = await this.client.post('/ask', { question });
    return response.data;
  }

  async getStats() {
    const response = await this.client.get('/stats');
    return response.data;
  }
}

export const api = new ApiClient();

export interface ExperimentCreate {
  title: string;
  situation: string;
  hypothesis: string;
  action: string;
  conditions: Record<string, any>;
  observation?: string;
  outcome?: 'success' | 'failure' | 'partial' | 'unknown';
  side_effects?: string[];
  decision?: string;
  lesson?: string;
  domain?: string;
  tags?: string[];
  confidence?: number;
}

export interface ExperimentResponse {
  id: string;
  title: string;
  situation: string;
  hypothesis: string;
  action: string;
  conditions: Record<string, any>;
  observation: string;
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  side_effects: string[];
  decision: string;
  lesson: string;
  domain: string;
  tags: string[];
  confidence: number;
  timestamp: string;
  memory_id?: string;
  observation_id?: string;
}

export interface ExperimentListResponse {
  experiments: ExperimentResponse[];
  total: number;
}

export interface PreflightRequest {
  proposed_action: string;
  current_conditions: Record<string, any>;
  context?: string;
}

export interface ConditionComparison {
  condition: string;
  historical_value: any;
  current_value: any;
  similarity: string;
}

export interface HistoricalEvidence {
  experiment_id: string;
  title: string;
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  conditions: Record<string, any>;
  lesson: string;
  side_effects: string[];
  similarity_score: number;
}

export interface PreflightResponse {
  recommendation: 'proceed_with_controlled_test' | 'proceed_with_caution' | 'gather_more_evidence' | 'avoid_repeating_under_current_conditions';
  confidence: number;
  reasoning: string;
  historical_evidence: HistoricalEvidence[];
  condition_comparison: ConditionComparison[];
  risks: string[];
  suggested_test: string;
  known_from_memory: string[];
  inference: string[];
  unknown: string[];
}

export interface RecallRequest {
  query: string;
  limit?: number;
}

export interface RecallResponse {
  memories: Array<{
    id: string;
    text: string;
    metadata: Record<string, any>;
    score: number;
  }>;
  total: number;
}