/**
 * User management functions for the database service
 */
import { createApiClient } from './api-client';
import type { Env } from '../types';

/**
 * Get user data by ID
 */
export async function getUserById(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const apiClient = createApiClient(env);
    const userResponse = await apiClient.getUser(userId);
    
    if (userResponse.status === 200 && Array.isArray(userResponse.data) && userResponse.data.length > 0) {
      // Remove sensitive data before returning
      const userData = userResponse.data[0];
      delete userData.password;
      
      return new Response(JSON.stringify(userData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to get user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Create a new user
 */
export async function createUser(request: Request, env: Env): Promise<Response> {
  try {
    const userData = await request.json() as any;
    
    // Generate a UUID if not provided
    if (!userData.id) {
      userData.id = crypto.randomUUID();
    }
    
    const apiClient = createApiClient(env);
    const createResponse = await apiClient.createUser(userData);
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      return new Response(JSON.stringify({ 
        id: userData.id,
        message: 'User created successfully' 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: createResponse.error || 'Failed to create user' 
    }), {
      status: createResponse.status || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to create user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update user data
 */
export async function updateUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const updates = await request.json() as any;
    
    // Ensure we're updating the correct user
    updates.id = userId;
    
    const apiClient = createApiClient(env);
    const updateResponse = await apiClient.updateUser(updates);
    
    if (updateResponse.status === 200) {
      return new Response(JSON.stringify({ 
        message: 'User updated successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: updateResponse.error || 'Failed to update user' 
    }), {
      status: updateResponse.status || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Delete a user
 */
export async function deleteUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const apiClient = createApiClient(env);
    const deleteResponse = await apiClient.deleteUser(userId);
    
    if (deleteResponse.status === 200) {
      return new Response(JSON.stringify({ 
        message: 'User deleted successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: deleteResponse.error || 'Failed to delete user' 
    }), {
      status: deleteResponse.status || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to delete user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const apiClient = createApiClient(env);
    const userResponse = await apiClient.getUser(userId);
    
    if (userResponse.status === 200 && Array.isArray(userResponse.data) && userResponse.data.length > 0) {
      const userData = userResponse.data[0];
      const isAdmin = userData.user_type === 'Admin';
      
      return new Response(JSON.stringify({ isAdmin }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to check admin status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get all admin users
 */
export async function getAdminUsers(request: Request, env: Env): Promise<Response> {
  try {
    const apiClient = createApiClient(env);
    // In a real implementation, you would filter users by user_type
    // Here we're using a simple approach for demonstration
    const usersResponse = await apiClient.getUser();
    
    if (usersResponse.status === 200 && Array.isArray(usersResponse.data)) {
      const adminUsers = usersResponse.data
        .filter(user => user.user_type === 'Admin')
        .map(user => user.id);
      
      return new Response(JSON.stringify({ adminUsers }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ adminUsers: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to get admin users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Set admin status for a user
 */
export async function setAdminStatus(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const { isAdmin } = await request.json() as { isAdmin: boolean };
    
    const apiClient = createApiClient(env);
    const updateResponse = await apiClient.updateUser({
      id: userId,
      user_type: isAdmin ? 'Admin' : 'User'
    });
    
    if (updateResponse.status === 200) {
      return new Response(JSON.stringify({ 
        message: 'Admin status updated successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: updateResponse.error || 'Failed to update admin status' 
    }), {
      status: updateResponse.status || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to set admin status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
