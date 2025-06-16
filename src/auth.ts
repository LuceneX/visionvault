import { RegisterUserSchema, LoginUserSchema, type User, type XHashPass } from './types';
import type { Env } from '../types';
import { handleError } from './error-utils';
import { createApiClient } from './api-client';

interface RequestBody {
  full_name?: string;
  email: string;
  password: string;
  user_type?: string;
}

export async function registerUser(request: Request, env: Env): Promise<Response> {
  try {
    // RECEIVE: Validate input
    const rawBody = await request.json() as RequestBody;
    
    // Ensure email is lowercase before validation
    const body = {
      ...rawBody,
      email: rawBody.email?.toLowerCase()
    };
    
    // Validate the data
    const validatedData = RegisterUserSchema.parse(body);
    const { full_name, email, password, user_type } = validatedData;
    
    // Check for existing user via ref-punk API
    const apiClient = createApiClient(env);
    const userResponse = await apiClient.getUser(undefined, email);
    
    if (userResponse.status === 200 && Array.isArray(userResponse.data) && userResponse.data.length > 0) {
      return new Response(JSON.stringify({ error: 'User already exists' }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // STORE: Create records via ref-punk API
    const userId = crypto.randomUUID();
    
    const createResponse = await apiClient.createUser({
      id: userId,
      full_name,
      email,
      password,
      user_type: user_type || 'User',
      subscription_type: 'Free'
    });

    if (createResponse.status !== 201 || createResponse.error) {
      return new Response(JSON.stringify({ 
        error: createResponse.error || 'Failed to create user'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SEND: Return created data
    return new Response(JSON.stringify({ 
      id: userId,
      api_key: createResponse.data.api_key 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function getUser(request: Request, env: Env): Promise<Response> {
  try {
    const userId = new URL(request.url).pathname.split('/').pop();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user data via ref-punk API
    const apiClient = createApiClient(env);
    const userResponse = await apiClient.getUser(userId);
    
    if (userResponse.status !== 200 || userResponse.error) {
      return new Response(JSON.stringify({ 
        error: userResponse.error || 'Failed to retrieve user'
      }), { 
        status: userResponse.status || 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Array.isArray(userResponse.data) || userResponse.data.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = userResponse.data[0];

    // SEND: Return user data
    return new Response(JSON.stringify({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      user_type: user.user_type,
      api_key: user.api_key,
      subscription_type: user.subscription_type
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function loginUser(request: Request, env: Env): Promise<Response> {
  try {
    // Verify worker token
    const authHeader = request.headers.get('Authorization');
    const workerToken = authHeader?.replace('Bearer ', '');
    
    if (workerToken !== env.WORKER_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // RECEIVE: Get and validate login data
    const rawBody = await request.json() as RequestBody;
    
    if (!rawBody.email || !rawBody.password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure email is lowercase before validation
    const body = {
      ...rawBody,
      email: rawBody.email.toLowerCase()
    };

    const validatedData = LoginUserSchema.parse(body);
    const { email, password } = validatedData;

    // STORE: Check credentials via ref-punk API
    const apiClient = createApiClient(env);
    const userResponse = await apiClient.getUser(undefined, email.toLowerCase());
    
    if (userResponse.status !== 200 || !Array.isArray(userResponse.data) || userResponse.data.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = userResponse.data[0];
    
    // Verify password
    if (user.password !== password) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SEND: Return user data with success flag
    return new Response(JSON.stringify({
      success: true,
      token: crypto.randomUUID(), // Simple token for testing
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_type: user.user_type,
        api_key: user.api_key,
        subscription_type: user.subscription_type
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function verifyToken(request: Request, env: Env): Promise<Response> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({ 
        valid: false,
        message: 'No token provided'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify worker token
    const workerToken = request.headers.get('X-Worker-Token');
    if (workerToken !== env.WORKER_TOKEN) {
      return new Response(JSON.stringify({ 
        valid: false,
        message: 'Unauthorized worker'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now just validate that it's a UUID since we're using UUID as tokens
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return new Response(JSON.stringify({ 
        valid: false,
        message: 'Invalid token format'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // In a real app, you would verify the token signature and expiry
    // For now, we'll just return a success response
    return new Response(JSON.stringify({
      valid: true,
      user: {
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        twoFactorEnabled: false
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Verify an authentication token
 */
export async function verifyToken(request: Request, env: Env): Promise<Response> {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Missing or invalid authorization header' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    
    // For worker verification, also check if this is a worker-to-worker request
    const workerToken = request.headers.get('X-Worker-Token');
    const isInternalRequest = workerToken === env.WORKER_TOKEN;
    
    // Verify the token
    try {
      // For demonstration, we're just checking if the token is valid
      // In a real implementation, you would verify the JWT
      return new Response(JSON.stringify({ 
        valid: true,
        userId: 'sample-user-id'  // In a real implementation, you would decode the JWT
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Invalid token' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      valid: false,
      error: error.message || 'Token verification failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
