import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'restaurant'], {
    errorMap: () => ({ message: "Role must be either 'user' or 'restaurant'" })
  }).default('user'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const restaurantRegisterSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  location: z.string().min(2, 'Location is required'),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  description: z.string().optional(),
});

export const paymentSchema = z.object({
  restaurantId: z.number().int().positive(),
  items: z.array(z.object({
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    name: z.string(),
  })),
  totalAmount: z.number().positive(),
  orderId: z.number().int().positive().optional(),
});

export const topUpSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  userId: z.number().int().positive().optional(),
});

