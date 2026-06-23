export type ApiResult<T> = { ok?: boolean; data?: T; error?: string } & T;

export interface PointsBalance { points: number; }
export interface CheckinResp { ok: boolean; points: number; earned: number; message: string; }
export interface CheckinStatus { checkedIn: boolean; }
export interface PointsHistory { history: { date: string; points: number; type: string }[]; }

export interface TextMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface TextGenerateReq { model: string; messages: TextMessage[]; temperature?: number; maxTokens?: number; thinking?: boolean; stream?: boolean; }
export interface TextGenerateResp { content: string; usage?: any; }

export interface ImageGenerateReq { model?: string; prompt: string; size?: string; n?: number; image?: string; }
export interface ImageGenerateResp { images: { url: string; b64?: string }[]; }

export interface VideoGenerateReq { model?: string; prompt?: string; image?: string; width?: number; height?: number; }
export interface VideoTask { id: string; status: 'pending' | 'processing' | 'completed' | 'failed'; url?: string; }