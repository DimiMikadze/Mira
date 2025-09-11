import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import CompanyCriteriaForm, { type CompanyCriteriaFormRef } from './company-criteria-form';
import { Search, Lightbulb, UserPlus, UserCheck } from 'lucide-react';
import { isValidURL, companyCriteriaUtils } from '@/lib/utils';
import React, { useState, useEffect, useRef } from 'react';

/* eslint-disable @next/next/no-img-element */

interface CompanySearchInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  companyCriteria: string;
  companyCriteriaLoaded: boolean;
  onCompanyCriteriaChange: () => void;
}

/**
 * Company Search Input Component
 *
 * Provides a search form for inputting company URLs with company criteria form integration
 * and client-side validation.
 */
const CompanySearchInput = ({
  onSubmit,
  isLoading,
  companyCriteria,
  companyCriteriaLoaded,
  onCompanyCriteriaChange,
}: CompanySearchInputProps) => {
  const [url, setUrl] = useState('');
  const [clientErrorMessage, setClientErrorMessage] = useState('');
  const [showCompanyCriteriaWarning, setShowCompanyCriteriaWarning] = useState(false);
  const [companyCriteriaWarningDismissed, setIsCompanyCriteriaWarningDismissed] = useState(false);
  const companyCriteriaFormRef = useRef<CompanyCriteriaFormRef>(null);
  const hasCompanyCriteria = companyCriteria.trim().length > 0;

  // Check if company criteria warning was previously dismissed
  useEffect(() => {
    setIsCompanyCriteriaWarningDismissed(companyCriteriaUtils.isCompanyCriteriaWarningDismissed());
  }, []);

  // Enhanced onChange handler that clears error when valid URL is typed
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    // Clear client error message if the new URL is valid
    if (clientErrorMessage && newUrl && isValidURL(newUrl)) {
      setClientErrorMessage('');
    }
  };

  // Handles form submission with validation
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate URL
    const validUrl = isValidURL(url);
    if (!validUrl) {
      setClientErrorMessage("That doesn't look like a website address. Try something like acme.com");
      return;
    }

    // Clear error
    setClientErrorMessage('');

    // Check if we should show company criteria warning (only if company criteria data is loaded)
    if (companyCriteriaLoaded && !hasCompanyCriteria && !companyCriteriaWarningDismissed) {
      setShowCompanyCriteriaWarning(true);
      return; // Don't submit yet, wait for user response
    }

    // Submit the form
    onSubmit(url);
  };

  // Handle company criteria warning actions
  const handleContinueWithoutCOmpanyCriteria = () => {
    companyCriteriaUtils.dismissCompanyCriteriaWarning();
    setIsCompanyCriteriaWarningDismissed(true);
    setShowCompanyCriteriaWarning(false);
    onSubmit(url);
  };

  const handleAddCompanyCriteria = () => {
    companyCriteriaUtils.dismissCompanyCriteriaWarning();
    setIsCompanyCriteriaWarningDismissed(true);
    setShowCompanyCriteriaWarning(false);
    companyCriteriaFormRef.current?.openDialog();
  };

  // Update company criteria state when criteria form dialog changes
  const handleCompanyCriteriaDialogChange = (open: boolean) => {
    if (!open) {
      // Dialog closed, update parent state
      onCompanyCriteriaChange();
    }
  };

  return (
    <div className='w-full border-b border-gray-200 py-4 bg-gray-100 px-4'>
      {/* Company URL input */}
      <form onSubmit={handleSubmit} className='mx-auto max-w-4xl'>
        <div className='relative w-full mx-auto flex items-center gap-4'>
          {/* Logo */}
          <img src='/logo.svg' alt='Mira Logo' className='hidden sm:block h-6 w-auto flex-shrink-0' />
          <div className='relative w-full'>
            <Input
              type='text'
              placeholder='Enter a company URL'
              className={`w-full h-14 pl-6 pr-28 rounded-full border bg-white focus:outline-none focus:ring-0 text-base transition-colors ${
                clientErrorMessage
                  ? 'border-red-500 focus:border-red-500 focus:border-2 focus-visible:ring-0 focus-visible:border-red-500 focus-visible:border-2'
                  : 'border-gray-300 !focus:border-black !focus:border-2 focus-visible:ring-0 !focus-visible:border-black !focus-visible:border-2'
              }`}
              onChange={handleUrlChange}
              value={url}
            />
            <div className='absolute right-16 top-1/2 -translate-y-1/2'>
              <TooltipProvider>
                <Tooltip open={showCompanyCriteriaWarning} onOpenChange={() => {}}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 border-0 cursor-pointer hover:bg-gray-200'
                        onClick={() => companyCriteriaFormRef.current?.openDialog()}
                        aria-label={hasCompanyCriteria ? 'Edit Company Criteria' : 'Set Company Criteria'}
                      >
                        {hasCompanyCriteria ? (
                          <UserCheck className='w-6 h-6 text-green-600' />
                        ) : (
                          <UserPlus className='w-6 h-6 text-gray-600' />
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                      side='bottom'
                      align='end'
                      sideOffset={4}
                      className='max-w-sm p-4 bg-white border border-gray-200 shadow-lg rounded-lg z-50 animate-in fade-in-0 zoom-in-95'
                    >
                      <div className='space-y-3'>
                        <div className='flex items-start gap-2'>
                          <Lightbulb className='w-4 h-4 mt-0.5 flex-shrink-0' />
                          <div>
                            <p className='font-medium'>Add Company Criteria for a Fit Score</p>
                            <p className='text-sm text-gray-700 mt-4'>
                              Add criteria like industry, size, or region to get a Fit Score.
                            </p>
                          </div>
                        </div>
                        <div className='flex gap-4 pt-2 mt-4'>
                          <Button size='sm' onClick={handleAddCompanyCriteria} className='cursor-pointer'>
                            Add Criteria
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={handleContinueWithoutCOmpanyCriteria}
                            className=' bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                          >
                            Continue without Criteria
                          </Button>
                        </div>
                      </div>
                    </TooltipPrimitive.Content>
                  </TooltipPrimitive.Portal>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button
              disabled={isLoading}
              type='submit'
              className='absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0 cursor-pointer'
            >
              <Search className='w-5 h-5 text-white' />
            </Button>
          </div>
        </div>
        {/* Client Error message */}
        {clientErrorMessage && <div className='text-red-500 text-sm mt-3 ml-0 sm:ml-34'>{clientErrorMessage}</div>}
      </form>

      {/* criteria Form - Outside main form to prevent nesting issues */}
      <CompanyCriteriaForm
        ref={companyCriteriaFormRef}
        onOpenChange={handleCompanyCriteriaDialogChange}
        onCompanyCriteriaSaved={onCompanyCriteriaChange}
      />
    </div>
  );
};

export default CompanySearchInput;
