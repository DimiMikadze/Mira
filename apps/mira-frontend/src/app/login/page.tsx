import LoginForm from '@/app/login/login-form';
import { getAuth, protectedAuthPage } from '@/lib/supabase/auth';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | mira',
};

async function LoginPage() {
  const { status } = await getAuth();
  protectedAuthPage(status);

  return <LoginForm />;
}

export default LoginPage;
