import { createSupabaseClient } from '@/lib/supabase/client';
import Papa from 'papaparse';
import { SupabaseClient } from '@supabase/supabase-js';

// Types for CSV data
export interface CSVRecord {
  [key: string]: string | number | boolean;
}

export interface Company {
  [key: string]: string | number | boolean;
}

const SUPABASE_BUCKET = 'CSV';

export const uploadCSVFile = async (data: CSVRecord[], fileName: string): Promise<string> => {
  const supabase = createSupabaseClient();
  const csv = Papa.unparse(data); // Ensure data is an array of objects

  // Create a Blob and generate file name
  const blob = new Blob([csv], { type: 'text/csv' });

  // Upload CSV to Supabase Storage
  const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(fileName, blob);

  if (uploadError) {
    console.error('Upload error:', uploadError.message);
    throw new Error('Failed to upload CSV to storage.');
  }

  // Get the public URL of the uploaded file
  const { data: publicData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(fileName);

  return publicData.publicUrl;
};

export const uploadUserCSVFile = async (file: File, userId: string): Promise<string> => {
  const supabase = createSupabaseClient();

  // Generate unique file name with user ID prefix for organization
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uniqueFileName = `${userId}/${timestamp}-${file.name}`;

  // Upload the File object directly to Supabase Storage
  const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(uniqueFileName, file);

  if (uploadError) {
    console.error('Upload error:', uploadError.message);
    throw new Error('Failed to upload CSV to storage.');
  }

  // Get the public URL of the uploaded file
  const { data: publicData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(uniqueFileName);

  return publicData.publicUrl;
};

export const deleteCSVFile = async (fileName: string) => {
  const supabase = createSupabaseClient();

  // Delete the file from Supabase storage
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).remove([fileName]);

  if (error) {
    console.error('Delete error:', error.message);
    throw new Error('Failed to delete file from storage.');
  }

  return data;
};

export const downloadCSVFile = async (filePath: string): Promise<Blob | null> => {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(filePath);

  if (error) {
    console.error('Error downloading file:', error.message);
    throw new Error('Failed to download file.');
  }

  return data;
};

export const loadCompaniesDataFromCSVFile = async (supabase: SupabaseClient, fileName: string): Promise<Company[]> => {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(fileName);

  if (error) {
    throw new Error(`Failed to download file from Supabase: ${error.message}`);
  }

  const fileContent = await data.text(); // Convert the file to text

  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map((e) => e.message).join(', ')}`));
          return;
        }
        resolve(results.data as Company[]);
      },
      error: (error: Error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
};
