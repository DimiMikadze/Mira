'use client';

import React, { useState, useRef } from 'react';
import { CloudUpload, FileText, X, RotateCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import CompanyFieldMappingDialog from './company-field-mapping-dialog';

interface FieldMapping {
  domain: string | null;
  companyLinkedInURL: string | null;
}

interface CompanyBulkEnrichmentProps {
  onFileUpload: (file: File, mapping: FieldMapping) => void;
  onFileRemove: () => void;
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
  onProcessStart,
  uploadedFile,
  isProcessing,
}: CompanyBulkEnrichmentProps) => {
  const [fileError, setFileError] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate CSV file and extract headers
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

    return new Promise<boolean>((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 5, // Only parse first 5 rows to get headers
        complete: (results) => {
          if (results.errors.length > 0) {
            setFileError('Invalid CSV format');
            resolve(false);
            return;
          }

          const headers = results.meta.fields || [];
          if (headers.length === 0) {
            setFileError('CSV file has no headers');
            resolve(false);
            return;
          }

          // Count total rows by parsing the entire file
          Papa.parse(file, {
            skipEmptyLines: true,
            complete: (fullResults) => {
              const totalRows = Math.max(0, fullResults.data.length - 1); // Subtract header row

              if (totalRows === 0) {
                setFileError('CSV file appears to be empty');
                resolve(false);
                return;
              }

              setCsvHeaders(headers);
              resolve(true);
            },
            error: () => {
              setFileError('Failed to read CSV file');
              resolve(false);
            },
          });
        },
        error: () => {
          setFileError('Failed to parse CSV file');
          resolve(false);
        },
      });
    });
  };

  // Handle file selection from input
  const handleFileSelect = async (file: File) => {
    const isValid = await validateAndProcessFile(file);
    if (isValid) {
      setPendingFile(file);
      setShowMappingDialog(true);
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

  // Handle field mapping confirmation
  const handleMappingConfirm = (mapping: FieldMapping) => {
    if (pendingFile) {
      onFileUpload(pendingFile, mapping);
      setPendingFile(null);
      setCsvHeaders([]);
    }
  };

  // Handle mapping dialog cancel
  const handleMappingCancel = () => {
    setPendingFile(null);
    setCsvHeaders([]);
    setFileError('');
    setShowMappingDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file replace
  const handleReplace = () => {
    setFileError('');
    fileInputRef.current?.click();
  };

  // Handle file remove
  const handleRemove = () => {
    setFileError('');
    setCsvHeaders([]);
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle replace file selection
  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // First remove the current file
      handleRemove();
      // Then handle the new file selection
      await handleFileSelect(file);
    }
  };

  if (uploadedFile) {
    // Show uploaded file state
    return (
      <div className='flex items-center gap-2'>
        <div className='flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-full px-4 py-3 h-14'>
          <FileText className='h-5 w-5 text-gray-600' />
          <span className='text-sm font-medium text-gray-900'>{uploadedFile.name}</span>
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
        <div className='absolute top-full left-0 right-0 mt-1 text-xs text-red-600 whitespace-nowrap'>{fileError}</div>
      )}

      {/* Field Mapping Dialog */}
      <CompanyFieldMappingDialog
        open={showMappingDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleMappingCancel();
          }
        }}
        csvHeaders={csvHeaders}
        onMappingConfirm={handleMappingConfirm}
        fileName={pendingFile?.name || ''}
      />
    </div>
  );
};

export default CompanyBulkEnrichment;
