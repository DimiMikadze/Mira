'use client';

import React from 'react';
import { PROGRESS_EVENTS, type ProgressEventType, type EnrichmentSources } from 'mira-ai/types';
import { Check, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { companyCriteriaUtils } from '@/lib/utils';

interface CompanyProgressProps {
  /** Current progress message to display */
  progressMessage: string;
  /** The current event type/step being processed */
  currentEventType?: ProgressEventType;
  /** Store messages for each completed step to persist their display */
  stepMessages?: Record<string, string>;
  /** Source configuration to determine which steps to show */
  sources?: EnrichmentSources;
}

/**
 * All possible progress steps with their configuration
 */
const ALL_STEPS = [
  { event: PROGRESS_EVENTS.DISCOVERY_STARTED, required: true }, // Always runs - basic website analysis
  { event: PROGRESS_EVENTS.INTERNAL_PAGES_STARTED, sourceKey: 'crawl' as keyof EnrichmentSources },
  { event: PROGRESS_EVENTS.LINKEDIN_STARTED, sourceKey: 'linkedin' as keyof EnrichmentSources },
  { event: PROGRESS_EVENTS.GOOGLE_SEARCH_STARTED, sourceKey: 'google' as keyof EnrichmentSources },
  { event: PROGRESS_EVENTS.COMPANY_ANALYSIS_STARTED, required: true }, // Always runs - final analysis
] as const;

/**
 * Build step order based on enabled sources
 */
const buildStepOrder = (sources?: EnrichmentSources) => {
  if (!sources) {
    // Default to only required steps (discovery and analysis) if no sources config provided
    return ALL_STEPS.filter((step) => 'required' in step && step.required).map((step) => step.event);
  }

  return ALL_STEPS.filter(
    (step) =>
      ('required' in step && step.required) || ('sourceKey' in step && step.sourceKey && sources[step.sourceKey])
  ).map((step) => step.event);
};

/** Type representing valid step events (subset of all progress events) */
type StepEventType = ProgressEventType;

/**
 * Human-readable labels for each step to display in the UI
 * Maps internal event names to user-friendly descriptions
 */
const STEP_LABELS = {
  [PROGRESS_EVENTS.DISCOVERY_STARTED]: 'Extracting Website Data',
  [PROGRESS_EVENTS.INTERNAL_PAGES_STARTED]: 'Extracting Internal Page Data',
  [PROGRESS_EVENTS.LINKEDIN_STARTED]: 'Analyzing LinkedIn Profile',
  [PROGRESS_EVENTS.GOOGLE_SEARCH_STARTED]: 'Searching Google',
  [PROGRESS_EVENTS.COMPANY_ANALYSIS_STARTED]: 'Analyzing Results',
} as const;

/**
 * Type guard function to check if a given event type is one of our defined step events
 * This helps distinguish between step events and other progress events (like CONNECTED, COMPLETED, etc.)
 * @param eventType - The event type to check
 * @param stepOrder - The dynamic step order based on sources
 * @returns true if the event type is a valid step event
 */
const isStepEvent = (eventType: ProgressEventType, stepOrder: ProgressEventType[]): eventType is StepEventType => {
  return stepOrder.includes(eventType);
};

/**
 * CompanyProgress - A visual progress tracker component for company enrichment process
 *
 * This component displays a vertical timeline showing the current progress through
 * the company analysis steps. Each step can be in one of three states:
 * - Completed (green with checkmark)
 * - Current/Active (blue with spinning loader)
 * - Pending (gray, not yet started)
 *
 * @param props - Component props containing progress information
 */
const CompanyProgress = ({ progressMessage, currentEventType, stepMessages = {}, sources }: CompanyProgressProps) => {
  // Build dynamic step order based on enabled sources
  const stepOrder = buildStepOrder(sources);

  /**
   * Calculate the current step index based on the event type
   * Special handling for different event states:
   * - CONNECTED: Show first step as current (index 0)
   * - Step events: Find their position in dynamic stepOrder
   * - Other events: Return -1 (no current step)
   */
  const currentStepIndex =
    currentEventType === PROGRESS_EVENTS.CONNECTED
      ? 0 // When connected, highlight the first step as about to start
      : currentEventType && isStepEvent(currentEventType, stepOrder)
      ? stepOrder.findIndex((step) => step === currentEventType) // Find the step's position
      : -1; // Not a step event, so no step is current

  return (
    <div className='mt-8 mb-6'>
      {/* Vertical Timeline Container */}
      <div className='space-y-6'>
        {stepOrder.map((step, index) => {
          // Determine the state of each step based on current progress
          const isCompleted = index < currentStepIndex; // Steps before current are completed
          const isCurrent = index === currentStepIndex; // This step is currently active

          return (
            <div key={step} className='relative flex items-start space-x-3'>
              {/* Step indicator circle with appropriate icon and styling */}
              <div className='flex-shrink-0 relative z-10'>
                {isCompleted ? (
                  // Completed step: Green circle with checkmark
                  <div className='w-5 h-5 bg-green-500 rounded-full flex items-center justify-center'>
                    <Check className='w-3 h-3 text-white' />
                  </div>
                ) : isCurrent ? (
                  // Current step: Blue circle with spinning loader
                  <div className='w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center'>
                    <Loader2 className='w-3 h-3 text-white animate-spin' />
                  </div>
                ) : (
                  // Pending step: Gray empty circle
                  <div className='w-5 h-5 bg-gray-300 rounded-full' />
                )}

                {/* Vertical connecting line between steps (all except the last one) */}
                {index < stepOrder.length - 1 && (
                  <div className='absolute top-6 left-1/2 transform -translate-x-1/2 w-px h-12 bg-gray-200' />
                )}
              </div>

              {/* Step content area with label and message */}
              <div className='flex-grow min-w-0'>
                {/* Step label with dynamic coloring based on status */}
                <div className='flex items-center h-5'>
                  <div
                    className={`text-sm font-medium leading-none ${
                      isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {STEP_LABELS[step]}
                  </div>
                </div>

                {/* 
                  Display appropriate message for this step:
                  - If current step: show live progress message
                  - If completed step: show stored message from stepMessages
                  - If pending step: show nothing (empty string)
                */}
                <div className='text-sm text-gray-600 mt-2 min-h-[20px]'>
                  {isCurrent && progressMessage ? progressMessage : stepMessages[step] || ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 
        Final completion message box
        Only shown when the entire enrichment process is complete
        Displays in a green success banner style
      */}
      {currentEventType === PROGRESS_EVENTS.ENRICHMENT_COMPLETED && progressMessage && (
        <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
          <div className='text-sm text-green-700 font-medium'>{progressMessage}</div>
        </div>
      )}

      <div className='flex flex-col space-y-4 mt-8'>
        {/* Company sources (execution time, sources, social media) */}
        <div className='flex flex-row space-x-4'>
          <Skeleton className='h-8 w-[200px]' />
          <Skeleton className='h-8 w-[100px]' />
          <Skeleton className='h-8 w-[200px]' />
        </div>

        {/* Company analysis title */}
        <Skeleton className='h-6 mt-4 w-[200px]' />

        {/* fit Score - Only show if criteria is defined */}
        {companyCriteriaUtils.hasCompanyCriteria() && (
          <>
            <Skeleton className='w-24 h-24 rounded-full mt-4' />
            <Skeleton className='h-[125px] rounded-xl w-full' />
          </>
        )}

        {/* Sections */}
        <Skeleton className='h-4 mt-4 w-[150px]' />
        <Skeleton className='h-[125px] rounded-xl w-full' />

        <Skeleton className='h-4 mt-4 w-[150px]' />
        <Skeleton className='h-[125px] rounded-xl w-full' />
      </div>
    </div>
  );
};

export default CompanyProgress;
