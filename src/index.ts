import { registerUser, loginUser, getUser } from './auth';
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

    try {
      // Route handling
      if (url.pathname === '/auth/register' && request.method === 'POST') {
        return await registerUser(request, env);
      }

      if (url.pathname === '/auth/login' && request.method === 'POST') {
        return await loginUser(request, env);
      }
      
      if (url.pathname.startsWith('/user/') && request.method === 'GET') {
        return await getUser(request, env);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Server error:', error);
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
