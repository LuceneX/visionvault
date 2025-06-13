import { RegisterUserSchema, LoginUserSchema, type User, type XHashPass } from './types';
import type { Env } from '../types';
import { handleError } from './error-utils';

interface RequestBody {
  full_name?: string;
  email?: string;
  password?: string;
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
    
    // Check for existing user
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // STORE: Create records
    const userId = crypto.randomUUID();
    const xhashId = crypto.randomUUID();
    const apiKey = crypto.randomUUID();

    // Store user and XHashPass in a transaction
    const stmt = env.DB.prepare(`
      INSERT INTO users (id, full_name, email, password, user_type) 
      VALUES (?, ?, ?, ?, ?)`
    );
    
    const xhashStmt = env.DB.prepare(`
      INSERT INTO XHashPass (id, user_id, subscription_type, api_key) 
      VALUES (?, ?, 'Free', ?)`
    );

    await env.DB.batch([
      stmt.bind(userId, full_name, email, password, user_type),
      xhashStmt.bind(xhashId, userId, apiKey)
    ]);

    // SEND: Return created data
    return new Response(JSON.stringify({ 
      id: userId,
      api_key: apiKey 
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

    // RECEIVE & STORE: Get user data
    const stmt = env.DB.prepare(`
      SELECT u.id, u.full_name, u.email, u.user_type, x.api_key, x.subscription_type
      FROM users u 
      LEFT JOIN XHashPass x ON u.id = x.user_id 
      WHERE u.id = ?
    `);
    
    const user = await stmt.bind(userId).first();
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    const body = await request.json() as RequestBody;
    const validatedData = LoginUserSchema.parse({
      ...body,
      email: body.email?.toLowerCase() // Ensure email is lowercase before validation
    });
    const { email, password } = validatedData;

    // STORE: Check credentials
    const user = await env.DB.prepare(`
      SELECT u.*, x.api_key, x.subscription_type 
      FROM users u
      LEFT JOIN XHashPass x ON u.id = x.user_id
      WHERE u.email = ? AND u.password = ?
    `).bind(email.toLowerCase(), password).first();

    if (!user) {
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
