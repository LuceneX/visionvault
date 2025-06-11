import { ZodError } from 'zod';

export function handleError(error: unknown): Response {
  console.error('Error:', error);
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return new Response(JSON.stringify({ 
      error: 'Validation failed',
      details: error.errors 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Handle other errors
  return new Response(JSON.stringify({ 
    error: 'An unexpected error occurred' 
  }), { 
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
