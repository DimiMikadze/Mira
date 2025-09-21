'use client';

import React, { useState, useRef } from 'react';
import { CloudUpload, FileText, X, RotateCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompanyBulkEnrichmentProps {
  onFileUpload: (file: File) => void;
  onFileRemove: () => void;
  onFileReplace: (file: File) => void;
  onProcessStart: () => void;
  uploadedFile: File | null;
  isProcessing: boolean;
}

/**
 * Company Bulk Enrichment Component
 *
 * Handles CSV file upload for batch processing of companies
 * Shows upload interface initially, then uploaded file info with actions
 */
const CompanyBulkEnrichment = ({
  onFileUpload,
  onFileRemove,
  onFileReplace,
  onProcessStart,
  uploadedFile,
  isProcessing,
}: CompanyBulkEnrichmentProps) => {
  const [fileError, setFileError] = useState('');
  const [rowCount, setRowCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate CSV file and count rows
  const validateAndProcessFile = async (file: File) => {
    setFileError('');

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Please upload a CSV file');
      return false;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10MB');
      return false;
    }

    try {
      // Read file to count rows
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim() !== '');
      const rows = Math.max(0, lines.length - 1); // Subtract header row

      if (rows === 0) {
        setFileError('CSV file appears to be empty');
        return false;
      }

      if (rows > 1000) {
        setFileError('Maximum 1000 companies allowed per batch');
        return false;
      }

      setRowCount(rows);
      return true;
    } catch {
      setFileError('Failed to read CSV file');
      return false;
    }
  };

  // Handle file selection from input or drag
  const handleFileSelect = async (file: File) => {
    const isValid = await validateAndProcessFile(file);
    if (isValid) {
      onFileUpload(file);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle upload button click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file replace
  const handleReplace = () => {
    setRowCount(null);
    setFileError('');
    fileInputRef.current?.click();
  };

  // Handle file remove
  const handleRemove = () => {
    setRowCount(null);
    setFileError('');
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle replace file selection
  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValid = await validateAndProcessFile(file);
      if (isValid) {
        onFileReplace(file);
      }
    }
  };

  if (uploadedFile) {
    // Show uploaded file state
    return (
      <div className='flex items-center gap-2'>
        <div className='flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-full px-4 py-3 h-14'>
          <FileText className='h-5 w-5 text-gray-600' />
          <span className='text-sm font-medium text-gray-900'>{uploadedFile.name}</span>
          <span className='text-sm text-gray-600'>({rowCount} rows)</span>
        </div>

        <div className='flex items-center gap-2'>
          {/* Remove button */}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-10 w-10 rounded-full p-0 border-gray-300 hover:border-red-400 hover:text-red-600 cursor-pointer'
            onClick={handleRemove}
            title='Remove file'
          >
            <X className='h-4 w-4' />
          </Button>

          {/* Replace button */}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-10 w-10 rounded-full p-0 border-gray-300 hover:border-blue-400 hover:text-blue-600 cursor-pointer'
            onClick={handleReplace}
            title='Replace file'
          >
            <RotateCcw className='h-4 w-4' />
          </Button>

          {/* Process button */}
          <Button
            type='button'
            className='h-10 px-4 rounded-full cursor-pointer'
            onClick={onProcessStart}
            disabled={isProcessing}
            title='Start processing'
          >
            <Play className='h-4 w-4 mr-1' />
            Process
          </Button>
        </div>

        {/* Hidden file input for replace functionality */}
        <input ref={fileInputRef} type='file' accept='.csv' onChange={handleReplaceFileChange} className='hidden' />
      </div>
    );
  }

  // Show upload state
  return (
    <div className='relative'>
      <Button
        type='button'
        variant='outline'
        className='h-14 w-14 rounded-full pl-3 pr-4 border-gray-300 hover:border-gray-400 focus:border-black focus:border-2 transition-colors cursor-pointer'
        onClick={handleUploadClick}
      >
        <CloudUpload className='h-6 w-6 text-gray-600' />
      </Button>

      <input ref={fileInputRef} type='file' accept='.csv' onChange={handleFileInputChange} className='hidden' />

      {fileError && (
        <div className='absolute top-full left-0 right-0 mt-1 text-xs text-red-600 whitespace-nowrap'>asfas</div>
      )}
    </div>
  );
};

export default CompanyBulkEnrichment;
