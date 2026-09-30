'use client';

import { useSession } from 'next-auth/react';
import type { Gender, UserRole } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  gender: Gender;
  must_change_password: boolean;
}

export function useAuth() {
  const { data: session, status } = useSession();

  const user: AuthUser | null = session?.user
    ? {
        id: (session.user as any).id,
        email: session.user.email!,
        name: session.user.name!,
        role: (session.user as any).role,
        gender: (session.user as any).gender,
        must_change_password: (session.user as any).must_change_password,
      }
    : null;

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
  };
}
