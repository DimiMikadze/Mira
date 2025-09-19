import React from 'react';
import Header from '@/components/header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = async ({ children }: DashboardLayoutProps) => {
  return (
    <div>
      <main className='w-full'>
        <Header />

        <div className='mt-20'>{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
