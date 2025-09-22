'use client';

interface BulkProgressProps {
  totalCompanies: number;
  elapsedTime: string;
}

const CompanyBulkProgress = ({ totalCompanies, elapsedTime }: BulkProgressProps) => {
  return (
    <div className='mt-8 mb-6'>
      <div className='flex flex-col items-center justify-center space-y-6'>
        {/* Title */}
        <h3 className='text-2xl font-bold text-blue-600'>Processing Bulk Enrichment</h3>
        <p className='text-gray-600'>Processing {totalCompanies} companies</p>

        {/* Bouncing dots */}
        <div className='flex items-center justify-center space-x-2'>
          <div className='w-3 h-3 bg-blue-600 rounded-full animate-bounce'></div>
          <div className='w-3 h-3 bg-blue-600 rounded-full animate-bounce' style={{ animationDelay: '0.1s' }}></div>
          <div className='w-3 h-3 bg-blue-600 rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
        </div>

        <p className='text-lg font-medium text-gray-800'>Enriching company data...</p>

        {/* Elapsed Time */}
        <div className='mt-6 p-4 bg-gray-50 rounded-lg'>
          <p className='text-sm text-gray-500 mb-1 text-center'>Elapsed Time</p>
          <p className='text-2xl font-mono font-bold text-blue-600 text-center'>{elapsedTime}</p>
        </div>
      </div>
    </div>
  );
};

export default CompanyBulkProgress;
