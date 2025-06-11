import type { Env } from '../types';

export interface RegisterUserBody {
  full_name: string;
  email: string;
  password: string;
  user_type: 'Client' | 'Enterprise' | 'Bot' | 'SuperUser';
}

export interface LoginUserBody {
  email: string;
  password: string;
}

export async function registerUser(body: RegisterUserBody, env: Env) {
  const { full_name, email, password, user_type } = body;
  
  // Check if user already exists
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (existingUser) {
    return new Response('User already exists', { status: 409 });
  }

  // Create new user
  const userId = crypto.randomUUID();
  const stmt = env.DB.prepare(
    'INSERT INTO users (id, full_name, email, password, user_type) VALUES (?, ?, ?, ?, ?)'
  );
  
  try {
    await stmt.bind(userId, full_name, email, password, user_type).run();
    
    // Create XHashPass entry with default Free subscription
    const xhashId = crypto.randomUUID();
    const apiKey = crypto.randomUUID(); // In production, use a more secure method
    
    await env.DB.prepare(
      'INSERT INTO XHashPass (id, user_id, subscription_type, api_key) VALUES (?, ?, ?, ?)'
    ).bind(xhashId, userId, 'Free', apiKey).run();

    return new Response(JSON.stringify({ 
      success: true,
      userId,
      apiKey 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response('Error creating user', { status: 500 });
  }
}

export async function loginUser(body: LoginUserBody, env: Env) {
  const { email, password } = body;
  
  const stmt = env.DB.prepare(`
    SELECT u.id, u.full_name, u.user_type, x.api_key, x.subscription_type 
    FROM users u 
    LEFT JOIN XHashPass x ON u.id = x.user_id 
    WHERE u.email = ? AND u.password = ?
  `);
  
  try {
    const user = await stmt.bind(email, password).first();
    
    if (!user) {
      return new Response('Invalid credentials', { status: 401 });
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        user_type: user.user_type,
        api_key: user.api_key,
        subscription_type: user.subscription_type
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response('Error during login', { status: 500 });
  }
}
