'use client';

import React from 'react';
import { BarChart3, MessageSquare, Target } from 'lucide-react';

/**
 * Company Search Info Component
 *
 * Displays welcome content explaining the enrichment process
 */
const CompanySearchInfo = () => {
  return (
    <div className='mt-8 mb-8 mx-auto'>
      <div className='text-center mb-8'>
        <p className='text-lg text-gray-700'>Enter a company website to get key insights and data analysis.</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-28'>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 bg-gray-50 rounded-xl flex items-center justify-center'>
            <BarChart3 className='w-6 h-6' />
          </div>
          <h3 className='text-md font-semibold'>Analyze Data</h3>
          <p className='text-md text-gray-700 mt-2'>Extract key business insights</p>
        </div>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 bg-gray-50 rounded-xl flex items-center justify-center'>
            <Target className='w-6 h-6 mx-auto' />
          </div>
          <h3 className='text-md font-semibold'>Score Fit</h3>
          <p className='text-md text-gray-700 mt-2'>Check alignment with your criteria</p>
        </div>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 bg-gray-50 rounded-xl flex items-center justify-center'>
            <MessageSquare className='w-6 h-6 mx-auto' />
          </div>
          <h3 className='text-md font-semibold'>Explore Sources</h3>
          <p className='text-md text-gray-700 mt-2'>See where each insight comes from</p>
        </div>
      </div>
    </div>
  );
};

export default CompanySearchInfo;
