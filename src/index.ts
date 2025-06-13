import { registerUser, loginUser, getUser, verifyToken } from './auth';
import type { Env } from '../types';
import { handleError } from './error-utils';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4321',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      // Route handling
      let response: Response;
      
      if (url.pathname === '/auth/register' && request.method === 'POST') {
        response = await registerUser(request, env);
      } else if (url.pathname === '/auth/login' && request.method === 'POST') {
        response = await loginUser(request, env);
      } else if (url.pathname.startsWith('/user/') && request.method === 'GET') {
        response = await getUser(request, env);
      } else if (url.pathname === '/auth/verify-token' && request.method === 'GET') {
        response = await verifyToken(request, env);
      } else {
        response = new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add CORS headers to the response
      const responseHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error: unknown) {
      console.error('Server error:', error);
      const errorResponse = handleError(error);
      // Add CORS headers to error response
      const errorHeaders = new Headers(errorResponse.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        errorHeaders.set(key, value);
      });
      return new Response(errorResponse.body, {
        status: errorResponse.status,
        headers: errorHeaders
      });
    }
  }
};
