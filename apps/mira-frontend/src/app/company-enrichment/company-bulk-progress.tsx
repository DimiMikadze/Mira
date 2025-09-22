'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface BulkProgressProps {
  totalCompanies: number;
}

const CompanyBulkProgress = ({ totalCompanies }: BulkProgressProps) => {
  return (
    <div className='mt-8 mb-12'>
      {/* Title */}
      <div className='flex items-center space-x-2'>
        <div className='w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center'>
          <Loader2 className='w-3 h-3 text-white animate-spin' />
        </div>
        <p className='text-sm font-medium leading-none text-blue-600'>
          Processing <b>{totalCompanies}</b> companies
        </p>
      </div>

      <div className='flex flex-col gap-6 mt-12'>
        <div className='flex flex-row justify-between'>
          <Skeleton className='h-8 w-[200px]' />
          <Skeleton className='h-8 w-[200px]' />
        </div>

        <div className='flex gap-4'>
          <Skeleton className='h-22 w-full' />
          <Skeleton className='h-22 w-full' />
          <Skeleton className='h-22 w-full' />
        </div>

        <div>
          <Skeleton className='h-100 w-full' />
        </div>
      </div>
    </div>
  );
};

export default CompanyBulkProgress;
