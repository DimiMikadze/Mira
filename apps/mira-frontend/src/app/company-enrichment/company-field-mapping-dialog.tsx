'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface FieldMapping {
  domain: string | null;
  companyLinkedInURL: string | null;
}

interface CompanyFieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvHeaders: string[];
  onMappingConfirm: (mapping: FieldMapping) => void;
  fileName: string;
}

/**
 * Company Field Mapping Dialog Component
 *
 * Allows users to map CSV columns to required fields (domain) and optional fields (LinkedIn URL)
 */
const CompanyFieldMappingDialog = ({
  open,
  onOpenChange,
  csvHeaders,
  onMappingConfirm,
}: CompanyFieldMappingDialogProps) => {
  const [domainField, setDomainField] = useState<string | null>(null);
  const [companyLinkedInURLField, setCompanyLinkedInURLField] = useState<string | null>(null);

  // Auto-detect likely domain fields
  const suggestDomainField = () => {
    const domainKeywords = ['domain', 'website', 'url', 'site', 'web'];
    return (
      csvHeaders.find((header) =>
        domainKeywords.some((keyword) => header.toLowerCase().includes(keyword.toLowerCase()))
      ) || null
    );
  };

  // Auto-detect likely LinkedIn fields
  const suggestCompanyLinkedInURLField = () => {
    const linkedinKeywords = ['linkedin', 'linkedin_url', 'linkedin_profile'];
    return (
      csvHeaders.find((header) =>
        linkedinKeywords.some((keyword) => header.toLowerCase().includes(keyword.toLowerCase()))
      ) || null
    );
  };

  // Initialize suggestions when dialog opens
  React.useEffect(() => {
    if (open && csvHeaders.length > 0) {
      if (!domainField) {
        setDomainField(suggestDomainField());
      }
      if (!companyLinkedInURLField) {
        setCompanyLinkedInURLField(suggestCompanyLinkedInURLField());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, csvHeaders]);

  const handleConfirm = () => {
    if (!domainField) return;

    onMappingConfirm({
      domain: domainField,
      companyLinkedInURL: companyLinkedInURLField,
    });

    onOpenChange(false);
  };

  const handleCancel = () => {
    setDomainField(null);
    setCompanyLinkedInURLField(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Map Company Fields</DialogTitle>
          <p className='text-sm text-gray-600'>
            Match the columns in your CSV file to the fields Mira needs. <b>Website</b> is required, others are
            optional.
          </p>
        </DialogHeader>

        <div className='py-6'>
          {/* Header Row */}
          <div className='flex items-center gap-8 mb-4'>
            <div className='flex-1'>
              <h3 className='font-semibold text-gray-700'>Property in Mira</h3>
            </div>
            <div className='flex items-center justify-center w-4'>
              <span className='text-transparent'>:</span>
            </div>
            <div className='flex-1'>
              <h3 className='font-semibold text-gray-700'>Column in your file</h3>
            </div>
          </div>

          {/* Mapping Rows */}
          <div className='space-y-4'>
            {/* Website (Domain) Field */}
            <div className='flex items-center gap-8'>
              <div className='flex-1'>
                <div className='bg-gray-100 rounded px-4 py-3 h-12 flex items-center'>
                  <span className='text-gray-700 text-sm'>Website</span>
                  <span className='text-red-500 ml-1'>*</span>
                </div>
              </div>
              <div className='flex items-center justify-center w-4'>
                <span className='text-gray-400'>:</span>
              </div>
              <div className='flex-1'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' className='w-full h-12 justify-between text-left'>
                      <span className={domainField ? 'text-gray-900' : 'text-gray-500'}>
                        {domainField || 'Select column'}
                      </span>
                      <ChevronDown className='h-4 w-4 opacity-50 ml-2' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className='w-full' align='start'>
                    {csvHeaders.map((header) => (
                      <DropdownMenuItem
                        key={header}
                        onClick={() => setDomainField(header)}
                        className={domainField === header ? 'bg-gray-100' : ''}
                      >
                        {header}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* LinkedIn URL Field */}
            <div className='flex items-center gap-8'>
              <div className='flex-1'>
                <div className='bg-gray-100 rounded px-4 py-3 h-12 flex items-center'>
                  <span className='text-gray-700 text-sm'>Company LinkedIn URL</span>
                </div>
              </div>
              <div className='flex items-center justify-center w-4'>
                <span className='text-gray-400'>:</span>
              </div>
              <div className='flex-1'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' className='w-full h-12 justify-between text-left'>
                      <span className={companyLinkedInURLField ? 'text-gray-900' : 'text-gray-500'}>
                        {companyLinkedInURLField || 'Select column'}
                      </span>
                      <ChevronDown className='h-4 w-4 opacity-50 ml-2' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className='w-full' align='start'>
                    <DropdownMenuItem onClick={() => setCompanyLinkedInURLField(null)}>
                      <span className='text-gray-500'>None</span>
                    </DropdownMenuItem>
                    {csvHeaders.map((header) => (
                      <DropdownMenuItem
                        key={header}
                        onClick={() => setCompanyLinkedInURLField(header)}
                        className={companyLinkedInURLField === header ? 'bg-gray-100' : ''}
                      >
                        {header}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!domainField}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFieldMappingDialog;
