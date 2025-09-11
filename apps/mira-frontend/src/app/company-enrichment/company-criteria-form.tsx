'use client';

import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';
import { companyCriteriaUtils } from '@/lib/utils';

export interface CompanyCriteriaFormRef {
  openDialog: () => void;
}

interface CompanyCriteriaFormProps {
  onOpenChange?: (open: boolean) => void;
  onCompanyCriteriaSaved?: () => void;
}

const CompanyCriteriaForm = forwardRef<CompanyCriteriaFormRef, CompanyCriteriaFormProps>(
  ({ onOpenChange, onCompanyCriteriaSaved }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [companyCriteria, setCompanyCriteria] = React.useState('');

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      openDialog: () => setOpen(true),
    }));

    // Load from localStorage on mount if available
    useEffect(() => {
      const saved = companyCriteriaUtils.getCompanyCriteria();
      if (saved) setCompanyCriteria(saved);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling up to parent form
      companyCriteriaUtils.setCompanyCriteria(companyCriteria.trim()); // Save trimmed company criteria (handles empty string)
      setOpen(false);
      // Notify parent that company criteria was saved
      onCompanyCriteriaSaved?.();
    };

    const handleOpenChange = (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    };

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className='max-h-[90vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle className='text-lg font-semibold'>Company Criteria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='mt-4 flex flex-col flex-1 min-h-0'>
            <div className='flex-1 min-h-0 flex flex-col'>
              <label className='block text-sm font-medium mb-2 flex-shrink-0'>
                Describe the type of company you&apos;re looking for
              </label>
              <div className='flex-1 min-h-0'>
                <AutosizeTextarea
                  minHeight={120}
                  maxHeight={400}
                  className='w-full h-full max-h-full'
                  placeholder='e.g. Mid-sized tech companies in North America, renewable energy startups in Europe, or universities in the US'
                  value={companyCriteria}
                  onChange={(e) => setCompanyCriteria(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className='mt-8 flex-shrink-0'>
              <DialogClose asChild>
                <Button type='button' variant='ghost' className='cursor-pointer'>
                  Cancel
                </Button>
              </DialogClose>
              <Button type='submit' className='cursor-pointer'>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);

CompanyCriteriaForm.displayName = 'CompanyCriteriaForm';

export default CompanyCriteriaForm;
