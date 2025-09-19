import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Folder, FolderPlus, Search, Edit } from 'lucide-react';
import { isValidURL } from '@/lib/utils';
import React, { useState } from 'react';
import { createWorkspace, updateWorkspace, WorkspaceRow } from '@/lib/supabase/orm';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import CompanyWorkspaceModal from './company-workspace-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createSupabaseClient } from '@/lib/supabase/client';

interface CompanySearchInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  workspaces: WorkspaceRow[];
  currentWorkspace: WorkspaceRow | null;
  authUser: User;
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<WorkspaceRow | null>>;
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
  workspaces,
  currentWorkspace,
  authUser,
  setCurrentWorkspace,
}: CompanySearchInputProps) => {
  const [url, setUrl] = useState('');
  const [clientErrorMessage, setClientErrorMessage] = useState('');
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceRow | undefined>(undefined);
  const router = useRouter();

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

    // Submit the form
    onSubmit(url);
  };

  const openWorkspaceCreate = () => {
    setEditingWorkspace(undefined);
    setIsWorkspaceModalOpen(true);
  };

  const openWorkspaceEdit = (workspace: WorkspaceRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkspace(workspace);
    setIsWorkspaceModalOpen(true);
  };

  const handleWorkspaceSave = async (workspaceData: Partial<WorkspaceRow>) => {
    try {
      const supabase = createSupabaseClient();

      if (editingWorkspace && workspaceData.id) {
        // Update existing workspace
        const updatedWorkspace = await updateWorkspace(supabase, workspaceData.id, workspaceData);
        setCurrentWorkspace(updatedWorkspace);
      } else {
        // Create new workspace
        const newWorkspace = await createWorkspace(supabase, {
          name: workspaceData.name!,
          user_id: authUser.id,
          analysis_company_criteria: workspaceData.analysis_company_criteria,
          analysis_executive_summary: workspaceData.analysis_executive_summary,
          source_crawl: workspaceData.source_crawl,
          source_google: workspaceData.source_google,
          source_linkedin: workspaceData.source_linkedin,
          datapoints: workspaceData.datapoints,
        });
        setCurrentWorkspace(newWorkspace);
      }

      setIsWorkspaceModalOpen(false);
      // Refresh the page to get updated workspaces from server
      router.refresh();
    } catch (error) {
      console.error('Error saving workspace:', error);
    }
  };

  return (
    <div className='w-full px-4'>
      {/* Company URL input */}

      <form onSubmit={handleSubmit} className='mx-auto max-w-4xl'>
        <div className='relative w-full mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4'>
          {/** Workspaces dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='outline'
                className='h-14 rounded-full gap-2 pl-3 pr-2 max-w-full sm:max-w-[240px] truncate border-gray-300 hover:border-gray-400 focus:border-black focus:border-2 transition-colors'
              >
                <span className='truncate'>{currentWorkspace ? currentWorkspace.name : 'Select workspace'}</span>
                <ChevronDown className='h-4 w-4 opacity-70' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-72'>
              <DropdownMenuItem onClick={openWorkspaceCreate} className='gap-2'>
                <FolderPlus className='h-4 w-4' />
                Create workspace
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {workspaces.length === 0 ? (
                <DropdownMenuItem disabled>No workspaces yet</DropdownMenuItem>
              ) : (
                workspaces.map((ws) => (
                  <DropdownMenuItem key={ws.id} onClick={() => setCurrentWorkspace(ws)} className='gap-2 group'>
                    <Folder className='h-4 w-4' />
                    <span className='truncate flex-1'>{ws.name}</span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
                      onClick={(e) => openWorkspaceEdit(ws, e)}
                    >
                      <Edit className='h-3 w-3' />
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/** Input and Button */}
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

      {/* Workspace Modal */}
      <CompanyWorkspaceModal
        open={isWorkspaceModalOpen}
        onOpenChange={setIsWorkspaceModalOpen}
        workspace={editingWorkspace}
        authUser={authUser}
        onSave={handleWorkspaceSave}
      />
    </div>
  );
};

export default CompanySearchInput;
