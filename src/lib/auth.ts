import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const jwtSecretRaw = process.env.JWT_SECRET || '4a886a68b5ae90bdb4f8be22e8dd9acbc9134dcc95cd5e67927660d6afdc6e69';
const JWT_SECRET = new TextEncoder().encode(jwtSecretRaw);

export const COOKIE_NAME = 'pos_auth_token';

export type SessionUser = {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  role: 'SUPER_ADMIN' | 'STORE_OWNER' | 'STORE_STAFF';
  storeId?: string | null;
  storeSlug?: string | null;
  storeName?: string | null;
  storeStatus?: string | null;
  subscriptionEnd?: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  // Cost 6 keeps verification ~4-5ms of CPU — inside the Workers free plan's
  // 10ms per-request limit. Raise to 10 (and use Workers Paid) for production.
  return bcrypt.hash(password, 6);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch (err) {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('FORBIDDEN_NOT_SUPER_ADMIN');
  }
  return user;
}

export async function requireStoreAccess(slug: string): Promise<{ user: SessionUser; store: any }> {
  const user = await requireAuth();
  
  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (!store) {
    throw new Error('STORE_NOT_FOUND');
  }

  // Super Admin can access any store
  if (user.role === 'SUPER_ADMIN') {
    return { user, store };
  }

  // Store Owner or Staff must match the store ID
  if (user.storeId !== store.id) {
    throw new Error('FORBIDDEN_STORE_ACCESS');
  }

  return { user, store };
}
