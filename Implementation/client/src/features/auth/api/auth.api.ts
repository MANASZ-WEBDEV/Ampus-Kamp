import { apiClient } from '@/lib/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  enrollmentNo: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'dept_head' | 'admin';
  department: { _id: string; code: string; name: string } | string;
  year?: number;
  skills: string[];
  status: 'pending' | 'active' | 'suspended';
  phoneVisible: boolean;
  allowInvites: boolean;
  emailVerified: boolean;
}

export interface PublicUser {
  id: string;
  name: string;
  branch: { _id: string; code: string; name: string } | string;
  year?: number;
  skills: string[];
  allowInvites: boolean;
  role: string;
}

export interface MeProfile extends AuthUser {
  phone?: string | null;
  lastLoginAt?: string;
  firstOpenedAt?: string;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export async function register(body: {
  enrollmentNo: string;
  collegeId: string;
  password: string;
}): Promise<{ userId: string; message: string }> {
  const res = await apiClient.post<{ data: { userId: string; message: string } }>(
    '/auth/register',
    body,
  );
  return res.data.data;
}

export async function verifyOtp(body: {
  userId: string;
  code: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await apiClient.post<{ data: { token: string; user: AuthUser } }>(
    '/auth/verify-otp',
    body,
  );
  return res.data.data;
}

export async function login(body: {
  enrollmentNo: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await apiClient.post<{ data: { token: string; user: AuthUser } }>(
    '/auth/login',
    body,
  );
  return res.data.data;
}

export async function resendOtp(body: {
  userId: string;
}): Promise<{ message: string }> {
  const res = await apiClient.post<{ data: { message: string } }>(
    '/auth/resend-otp',
    body,
  );
  return res.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function getMe(): Promise<MeProfile> {
  const res = await apiClient.get<{ data: MeProfile }>('/users/me');
  return res.data.data;
}

export async function updateMe(body: {
  skills?: string[];
  phone?: string | null;
  phoneVisible?: boolean;
  allowInvites?: boolean;
}): Promise<Partial<MeProfile>> {
  const res = await apiClient.put<{ data: Partial<MeProfile> }>('/users/me', body);
  return res.data.data;
}

export async function getUserById(id: string): Promise<PublicUser> {
  const res = await apiClient.get<{ data: PublicUser }>(`/users/${id}`);
  return res.data.data;
}
