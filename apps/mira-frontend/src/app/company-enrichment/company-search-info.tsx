'use client';

import React from 'react';
import { BarChart3, Mail, SearchCheck, Target } from 'lucide-react';

/**
 * Company Search Info Component
 *
 * Displays welcome content explaining the enrichment process
 */
const CompanySearchInfo = () => {
  return (
    <div className='mt-8 mb-20 mx-auto'>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mt-18'>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center'>
            <BarChart3 className='w-6 h-6 text-blue-500' />
          </div>
          <h3 className='text-md font-semibold'>1. Research Company</h3>
          <p className='text-sm text-gray-600 mt-2'>Gather structured company information.</p>
        </div>

        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center'>
            <Target className='w-6 h-6 mx-auto text-green-500' />
          </div>
          <h3 className='text-md font-semibold'>2. Score Fit</h3>
          <p className='text-sm text-gray-600 mt-2'>Measure how well companies match your criteria.</p>
        </div>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center'>
            <SearchCheck className='w-6 h-6 mx-auto text-purple-500' />
          </div>
          <h3 className='text-md font-semibold'>3. Explore Sources</h3>
          <p className='text-sm text-gray-600 mt-2'>Get data with sources and confidence scores.</p>
        </div>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center'>
            <Mail className='w-6 h-6 mx-auto text-teal-600' />
          </div>
          <h3 className='text-md font-semibold'>4. Draft Outreach</h3>
          <p className='text-sm text-gray-600 mt-2'>Generate LinkedIn and email drafts from research.</p>
        </div>
      </div>
    </div>
  );
};

export default CompanySearchInfo;
