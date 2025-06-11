import { registerUser, loginUser, getUser } from './auth';
import type { RegisterUserBody, LoginUserBody } from './auth';
import type { Env } from '../types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // Route handling
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
      
      if (url.pathname.startsWith('/user/') && request.method === 'GET') {
        const response = await getUser(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: corsHeaders
      });
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
    headers: newHeaders
  });
}
