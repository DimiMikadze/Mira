import { User } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/supabase/orm';
import { Routes } from '@/constants/routes';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface getAuthPayload {
  authUser: User | null;
  status: AuthStatus;
}

type AuthStatus = 'UNAUTHENTICATED' | 'AUTHENTICATED';

export async function getAuth(): Promise<getAuthPayload> {
  const supabase = await createSupabaseServerClient();
  const authUser = await getAuthUser(supabase);

  if (!authUser) {
    return {
      authUser: null,
      status: 'UNAUTHENTICATED',
    };
  }

  return {
    authUser,
    status: 'AUTHENTICATED',
  };
}

export const protectDashboardPage = (status: AuthStatus) => {
  switch (status) {
    case 'UNAUTHENTICATED':
      redirect(Routes.LOGIN);
    default:
  }
};

export const protectedAuthPage = (status: AuthStatus) => {
  switch (status) {
    case 'AUTHENTICATED':
      redirect(Routes.HOME);
    default:
  }
};
