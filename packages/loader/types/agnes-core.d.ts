// Minimal type stub for @agnes/core (CommonJS module without .d.ts).
declare module '@agnes/core' {
  export function loadConfig(): { apiKey: string; baseUrl: string };
  export function saveConfig(config: { apiKey?: string; baseUrl?: string }, location?: 'local' | 'global'): string;
  export class AgnesClient {
    constructor(config: { apiKey: string; baseUrl: string });
    chat(args: Record<string, unknown>): Promise<unknown> | unknown;
    generateImage(args: Record<string, unknown>): Promise<unknown>;
    createVideo(args: Record<string, unknown>): Promise<unknown>;
    waitForVideo(id: string, opts?: Record<string, unknown>): Promise<unknown>;
    static resolveImage(img: string): Promise<string>;
    static downloadFile(url: string, dest: string): Promise<string>;
    static saveBase64Image(b64: string, dest: string): string;
  }
}
