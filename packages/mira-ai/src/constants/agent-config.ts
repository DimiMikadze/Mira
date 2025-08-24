import { AgentConfig } from '../types/agent.js';

/**
 * Central place to see which LLMs and parameters we use for each agent.
 */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  discoveryDataPoints: {
    model: 'gpt-4o',
    temperature: 0.1,
  },
  discoveryInternalLinks: {
    model: 'gpt-4o',
    temperature: 0.0,
  },
  internalPages: {
    model: 'gpt-4o',
    temperature: 0.1,
  },
  googleSearch: {
    model: 'gpt-4o',
    temperature: 0.1,
  },
  companyAnalysis: {
    model: 'gpt-4o',
    temperature: 0.2,
  },
  linkedin: {
    model: 'gpt-4o',
    temperature: 0.1,
  },
};
