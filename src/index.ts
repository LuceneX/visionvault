import { registerUser, loginUser } from './auth';
import type { RegisterUserBody, LoginUserBody } from './auth';

interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    // Route handling
    try {
      if (url.pathname === '/auth/register' && request.method === 'POST') {
        const body = await request.json() as RegisterUserBody;
        const response = await registerUser(body, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (url.pathname === '/auth/login' && request.method === 'POST') {
        const body = await request.json() as LoginUserBody;
        const response = await loginUser(body, env);
        return addCorsHeaders(response, corsHeaders);
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
