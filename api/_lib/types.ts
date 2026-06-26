// Framework-agnostic request/response shapes. The same handlers run under the
// local Express dev server (server/dev-api.ts) and as Vercel serverless
// functions (api/**), since both satisfy this minimal interface structurally.

export interface ApiReq {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, any>;
}

export interface ApiRes {
  status(code: number): ApiRes;
  json(body: any): void;
  setHeader(name: string, value: string): void;
  end(body?: any): void;
}

export type Handler = (req: ApiReq, res: ApiRes) => unknown | Promise<unknown>;
