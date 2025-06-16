import { registerUser, loginUser, verifyToken } from './auth';
import { 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  isUserAdmin, 
  getAdminUsers, 
  setAdminStatus 
} from './user-management';
import type { Env } from '../types';
import { handleError } from './error-utils';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4321',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Worker-Token',
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

    // Verify worker token for protected routes
    const workerToken = request.headers.get('X-Worker-Token');
    const isInternalRequest = workerToken === env.WORKER_TOKEN;
    
    // Routes that require authentication
    if (url.pathname.startsWith('/user/') || url.pathname === '/user' || 
        url.pathname.startsWith('/users/')) {
      if (!isInternalRequest) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    try {
      // Route handling
      let response: Response;
      
      if (url.pathname === '/auth/register' && request.method === 'POST') {
        response = await registerUser(request, env);
      } else if (url.pathname === '/auth/login' && request.method === 'POST') {
        response = await loginUser(request, env);
      } else if (url.pathname.startsWith('/user/') && request.method === 'GET') {
        // Get specific user data
        const userId = url.pathname.split('/')[2];
        response = await getUserById(request, env, userId);
      } else if (url.pathname === '/user' && request.method === 'POST') {
        // Create a new user
        response = await createUser(request, env);
      } else if (url.pathname.startsWith('/user/') && request.method === 'POST') {
        // Update user data
        const userId = url.pathname.split('/')[2];
        response = await updateUser(request, env, userId);
      } else if (url.pathname.startsWith('/user/') && request.method === 'DELETE') {
        // Delete a user
        const userId = url.pathname.split('/')[2];
        response = await deleteUser(request, env, userId);
      } else if (url.pathname.startsWith('/users/') && url.pathname.includes('/is-admin') && request.method === 'GET') {
        // Check if user is admin
        const userId = url.pathname.split('/')[2];
        response = await isUserAdmin(request, env, userId);
      } else if (url.pathname === '/users/admins' && request.method === 'GET') {
        // Get all admin users
        response = await getAdminUsers(request, env);
      } else if (url.pathname.startsWith('/users/') && url.pathname.includes('/admin-status') && request.method === 'POST') {
        // Set admin status
        const userId = url.pathname.split('/')[2];
        response = await setAdminStatus(request, env, userId);
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
