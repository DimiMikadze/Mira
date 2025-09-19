'use client';

import { Label } from '@/components/ui/label';
import { loginAction } from './login-action';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useActionState } from 'react';

/* eslint-disable @next/next/no-img-element */

const LoginForm = () => {
  const [state, formAction] = useActionState(loginAction, {
    errorMessage: '',
  });

  return (
    <div className='p-6 py-8 mt-8 rounded-md max-w-lg bg-gray-100 mx-auto'>
      <div className='flex flex-col items-center mb-8'>
        <img src='/logo.svg' alt='Mira Logo' className='hidden sm:block h-6 w-auto flex-shrink-0' />
      </div>

      <form action={formAction}>
        <div className='mb-4'>
          <Label htmlFor='email'>Email</Label>
          <Input id='email' type='email' name='email' className='bg-white mt-2' required />
        </div>

        <div className='mb-4'>
          <Label htmlFor='password'>Password</Label>
          <Input id='password' type='password' name='password' className='bg-white mt-2' required />
        </div>

        {state.errorMessage && <p className='mb-4 text-red-600 text-sm'>{state.errorMessage}</p>}

        <Button type='submit' className='cursor-pointer mt-4 w-full' size='lg'>
          Log in
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
