'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value, ...props }, ref) => (
  <div ref={ref} className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-200', className)} {...props}>
    <div
      className='h-full bg-blue-500 transition-all duration-300 ease-in-out'
      style={{
        width: value !== undefined ? `${Math.min(100, Math.max(0, value))}%` : '100%',
        animation: value === undefined ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
      }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
