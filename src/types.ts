import { FunctionDeclaration } from "@google/genai";

export type AgentId = string;

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  expertise: string;
  voicePrompt: string;
  powerLevel: number;
  status: 'active' | 'idle' | 'speaking';
  isHandRaised: boolean;
  isFavorite: boolean;
  isSelected: boolean;
  initial: string;
  tools?: FunctionDeclaration[];
  avatar?: string; // Base64 or URL
  tone?: string;
  voice?: string;
  knowledgeBase?: {
    files?: KnowledgeFile[];
    url?: string;
  };
}

export interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  agentId?: AgentId;
  agentName?: string;
  content: string;
  timestamp: Date;
  isPartial?: boolean;
  toolCall?: {
    name: string;
    args: any;
  };
  toolResult?: any;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Base64 or text
}

export type MeetingPhase = 
  | 'WAIT_FOR_PROMPT'
  | 'WELCOME'
  | 'INTRODUCTIONS'
  | 'FIRST_IMPRESSIONS'
  | 'DEEP_DIVE_MODELS'
  | 'DEEP_DIVE_STACK'
  | 'DEEP_DIVE_APPROACH'
  | 'RISK_ASSESSMENT'
  | 'DEBATE'
  | 'SYNTHESIS';

export interface MeetingState {
  phase: MeetingPhase;
  currentAgentIndex: number;
  userPrompt: string;
  isMeetingRunning: boolean;
}
