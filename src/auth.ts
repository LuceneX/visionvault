import { 
  RegisterUserSchema, 
  LoginUserSchema, 
  ApiKeyMetadata, 
  ErrorResponse,
  API_KEY_EXPIRATION,
  RATE_LIMITS
} from './types';
import type { Env } from '../types';
import jwt from '@tsndr/cloudflare-worker-jwt';

// Generate a secure API key following NIST guidelines
function generateApiKey(): { keyId: string; apiKey: string } {
  const keyId = crypto.randomUUID();
  const apiKey = [...crypto.getRandomValues(new Uint8Array(32))]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return { keyId, apiKey };
}

// Calculate expiration date based on subscription type
function getApiKeyExpiration(subscriptionType: keyof typeof API_KEY_EXPIRATION): string {
  const days = API_KEY_EXPIRATION[subscriptionType];
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function registerUser(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const validatedData = RegisterUserSchema.parse(body);
    const { full_name, email, password, user_type } = validatedData;
    
    // Check if user already exists
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();
    
    if (existingUser) {
      const error: ErrorResponse = {
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email already exists'
        }
      };
      return new Response(JSON.stringify(error), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new user
    const userId = crypto.randomUUID();
    const stmt = env.DB.prepare(
      'INSERT INTO users (id, full_name, email, password, user_type) VALUES (?, ?, ?, ?, ?)'
    );
    
    // Generate API key with metadata
    const { keyId, apiKey } = generateApiKey();
    const xhashId = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = getApiKeyExpiration('Free');

    const apiKeyMetadata: ApiKeyMetadata = {
      created_at: now,
      expires_at: expiresAt,
      key_id: keyId,
      user_id: userId,
      subscription_type: 'Free'
    };
    
    try {
      await env.DB.batch([
        stmt.bind(userId, full_name, email.toLowerCase(), password, user_type),
        env.DB.prepare(
          'INSERT INTO XHashPass (id, user_id, subscription_type, api_key, rate_limit, rate_limit_reset_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(xhashId, userId, 'Free', apiKey, RATE_LIMITS.Free, now)
      ]);

      // Generate JWT for initial session
      const token = await jwt.sign(
        { userId, keyId },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return new Response(JSON.stringify({ 
        success: true,
        userId,
        apiKey,
        metadata: apiKeyMetadata,
        token
      }), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'DB_ERROR',
          message: 'Error creating user account',
          details: { error: error instanceof Error ? error.message : String(error) }
        }
      };
      return new Response(JSON.stringify(errorResponse), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: { error: error instanceof Error ? error.message : String(error) }
      }
    };
    return new Response(JSON.stringify(errorResponse), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
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
