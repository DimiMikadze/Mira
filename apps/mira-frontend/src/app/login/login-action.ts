'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Routes } from '@/constants/routes';
import { getAuth } from '@/lib/supabase/auth';

const PASSWORD_MIN_LENGTH = 6;

export type LoginFormState = {
  errorMessage?: string;
};

type ZodIssue = {
  message: string;
  path: (string | number)[];
  code: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loginAction = async (prevState: any, formData: FormData): Promise<LoginFormState> => {
  const { authUser } = await getAuth();
  if (authUser) throw new Error('Already authorized.');

  const schema = z.object({
    email: z.string().email('Email is not valid'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least 6 ${PASSWORD_MIN_LENGTH} characters long`),
    intendedUrl: z.string().nullable(),
  });
  const result = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    intendedUrl: formData.get('intendedUrl'),
  });
  if (!result.success) {
    const errors = result.error.issues.map((issue: ZodIssue) => {
      return `${issue.message}`;
    });

    return { errorMessage: errors.join('\n') };
  }

  // Supabase
  const { email, password, intendedUrl } = result.data;
  const supabase = await createSupabaseServerClient();
  const response = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (response.error) {
    return { errorMessage: response.error.message };
  }

  redirect(intendedUrl || Routes.HOME);
};

export const logoutAction = async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(Routes.LOGIN);
};
