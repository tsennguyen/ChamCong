import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Vui lòng nhập email và mật khẩu');
        }

        const supabase = createAdminClient();
        const cleanEmail = credentials.email.trim().toLowerCase();
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .ilike('email', cleanEmail)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !user) {
          throw new Error('Email hoặc mật khẩu không đúng');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          throw new Error('Email hoặc mật khẩu không đúng');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          gender: user.gender,
          must_change_password: user.must_change_password,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.gender = (user as any).gender;
        token.must_change_password = (user as any).must_change_password;
      }
      if (trigger === 'update') {
        token.must_change_password = false;
        if (session && typeof session === 'object' && 'must_change_password' in session) {
          token.must_change_password = (session as any).must_change_password;
        }
      }
      // Đảm bảo role không bị mất
      if (!token.role && token.email) {
        token.role = token.email.toLowerCase().includes('admin') ? 'admin' : 'teacher';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role || (session.user.email?.toLowerCase().includes('admin') ? 'admin' : 'teacher');
        (session.user as any).gender = token.gender;
        (session.user as any).must_change_password = token.must_change_password;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
