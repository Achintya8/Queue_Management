import { Request } from 'express';

export interface User {
user_id: string;
name: string;
phone: string;
email?: string;
password_hash: string;
created_at: Date;
notification_preferences?: any;
}

export interface Staff {
staff_id: string;
name: string;
email: string;
password_hash: string;
role: 'admin' | 'operator';
is_active: boolean;
created_at: Date;
}

export interface AuthRequest extends Request {
user?: {
id: string;
phone?: string;
email?: string;
role?: string;
type: 'user' | 'staff';
};
}

export interface JWTPayload {
id: string;
phone?: string;
email?: string;
role?: string;
type: 'user' | 'staff';
}