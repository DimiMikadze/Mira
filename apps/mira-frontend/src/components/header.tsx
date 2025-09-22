import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/app/login/login-action';
import Link from 'next/link';
import { Routes } from '@/constants/routes';
import { CircleUser } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* eslint-disable @next/next/no-img-element */

const Header = () => {
  return (
    <div className='w-full h-14 border-b flex justify-between items-center fixed top-0 left-0 px-4 z-50 bg-gray-100'>
      <div className='flex items-center'>
        <Link href={Routes.HOME}>
          <img src='/logo.svg' alt='Mira Logo' className='h-5 w-auto flex-shrink-0' />
        </Link>
      </div>

      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              style={{ outline: 'none', boxShadow: 'none' }}
              className='cursor-pointer'
            >
              <CircleUser style={{ width: '22px', height: '22px' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-56'>
            <DropdownMenuItem onClick={logoutAction} className='cursor-pointer'>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Header;
