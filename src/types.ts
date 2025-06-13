import { z } from 'zod';

// User type enum for access control
export const UserType = z.enum(['Client', 'Enterprise', 'Bot', 'SuperUser']);
export type UserType = z.infer<typeof UserType>;

// Subscription type enum
export const SubscriptionType = z.enum(['Free', 'Pro', 'Premium', 'Enterprise']);
export type SubscriptionType = z.infer<typeof SubscriptionType>;

// Basic input validation
export const RegisterUserSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string(), // Password validation handled by auth worker
  user_type: UserType
});

export const LoginUserSchema = z.object({
  email: z.string().email().toLowerCase().min(1, { message: "Email is required" }),
  password: z.string().min(1, { message: "Password is required" })
});

// Response types
export interface User {
  id: string;
  full_name: string;
  email: string;
  user_type: UserType;
}

export interface XHashPass {
  id: string;
  user_id: string;
  subscription_type: SubscriptionType;
  api_key: string;
}
