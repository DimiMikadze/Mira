'use client';

import React from 'react';
import { Copy, Check, Mail } from 'lucide-react';
import { type OutreachResult } from '@/lib/outreach';

interface CompanyOutreachProps {
  outreach: OutreachResult;
}

const CompanyOutreach = ({ outreach }: CompanyOutreachProps) => {
  // Copy helper
  const handleCopy = (value: unknown) => {
    try {
      const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value, null, 2);
      void navigator.clipboard?.writeText(text);
    } catch {
      // no-op
    }
  };

  const hasOutreach = outreach.linkedin || outreach.email;

  if (!hasOutreach) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div className='space-y-8'>
        {/* LinkedIn Outreach */}
        {outreach.linkedin && (
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold flex items-center gap-2'>
              <div className='h-5 w-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold'>
                in
              </div>
              LinkedIn Outreach
            </h3>

            {/* Connection Note */}
            {outreach.linkedin.connection_note && (
              <div className='group'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-bold text-sm text-gray-700'>Connection Request Note</h4>
                  <button
                    type='button'
                    onClick={() => handleCopy(outreach.linkedin!.connection_note)}
                    className='w-8 h-8 rounded-full border-2 border-gray-300 bg-white 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     flex items-center justify-center hover:border-gray-400 cursor-pointer
                     [&:active_svg.copy-icon]:hidden [&:active_svg.check-icon]:block
                     [&:focus_svg.copy-icon]:hidden [&:focus_svg.check-icon]:block'
                    aria-label='Copy connection note'
                  >
                    <Copy className='copy-icon w-4 h-4 text-gray-600 block' />
                    <Check className='check-icon w-4 h-4 text-green-600 hidden' />
                  </button>
                </div>
                <div className='p-3 bg-gray-50 rounded-lg border text-sm'>{outreach.linkedin.connection_note}</div>
              </div>
            )}

            {/* Acceptance Message */}
            {outreach.linkedin.acceptance_message && (
              <div className='group'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-bold text-sm text-gray-700'>Acceptance Message</h4>
                  <button
                    type='button'
                    onClick={() => handleCopy(outreach.linkedin!.acceptance_message)}
                    className='w-8 h-8 rounded-full border-2 border-gray-300 bg-white 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     flex items-center justify-center hover:border-gray-400 cursor-pointer
                     [&:active_svg.copy-icon]:hidden [&:active_svg.check-icon]:block
                     [&:focus_svg.copy-icon]:hidden [&:focus_svg.check-icon]:block'
                    aria-label='Copy acceptance message'
                  >
                    <Copy className='copy-icon w-4 h-4 text-gray-600 block' />
                    <Check className='check-icon w-4 h-4 text-green-600 hidden' />
                  </button>
                </div>
                <div className='p-3 bg-gray-50 rounded-lg border text-sm whitespace-pre-wrap'>
                  {outreach.linkedin.acceptance_message}
                </div>
              </div>
            )}

            {/* InMail Subject */}
            {outreach.linkedin.inmail_subject && (
              <div className='group'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-bold text-sm text-gray-700'>InMail Subject</h4>
                  <button
                    type='button'
                    onClick={() => handleCopy(outreach.linkedin!.inmail_subject)}
                    className='w-8 h-8 rounded-full border-2 border-gray-300 bg-white 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     flex items-center justify-center hover:border-gray-400 cursor-pointer
                     [&:active_svg.copy-icon]:hidden [&:active_svg.check-icon]:block
                     [&:focus_svg.copy-icon]:hidden [&:focus_svg.check-icon]:block'
                    aria-label='Copy InMail subject'
                  >
                    <Copy className='copy-icon w-4 h-4 text-gray-600 block' />
                    <Check className='check-icon w-4 h-4 text-green-600 hidden' />
                  </button>
                </div>
                <div className='p-3 bg-gray-50 rounded-lg border text-sm'>{outreach.linkedin.inmail_subject}</div>
              </div>
            )}

            {/* InMail Message */}
            {outreach.linkedin.inmail_message && (
              <div className='group'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-bold text-sm text-gray-700'>InMail Message</h4>
                  <button
                    type='button'
                    onClick={() => handleCopy(outreach.linkedin!.inmail_message)}
                    className='w-8 h-8 rounded-full border-2 border-gray-300 bg-white 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     flex items-center justify-center hover:border-gray-400 cursor-pointer
                     [&:active_svg.copy-icon]:hidden [&:active_svg.check-icon]:block
                     [&:focus_svg.copy-icon]:hidden [&:focus_svg.check-icon]:block'
                    aria-label='Copy InMail message'
                  >
                    <Copy className='copy-icon w-4 h-4 text-gray-600 block' />
                    <Check className='check-icon w-4 h-4 text-green-600 hidden' />
                  </button>
                </div>
                <div className='p-3 bg-gray-50 rounded-lg border text-sm whitespace-pre-wrap'>
                  {outreach.linkedin.inmail_message}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Outreach */}
        {outreach.email && (
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold flex items-center gap-2'>
              <Mail className='h-5 w-5 text-gray-600' />
              Email Outreach
            </h3>

            {/* Initial Email Subject */}
            {outreach.email.email_subject && (
              <div className='group'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-bold text-sm text-gray-700'>Email Subject</h4>
                  <button
                    type='button'
                    onClick={() => handleCopy(outreach.email!.email_subject)}
                    className='w-8 h-8 rounded-full border-2 border-gray-300 bg-white 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     flex items-center justify-center hover:border-gray-400 cursor-pointer
                     [&:active_svg.copy-icon]:hidden [&:active_svg.check-icon]:block
                     [&:focus_svg.copy-icon]:hidden [&:focus_svg.check-icon]:block'
                    aria-label='Copy email subject'
                  >
                    <Copy className='copy-icon w-4 h-4 text-gray-600 block' />
                    <Check className='check-icon w-4 h-4 text-green-600 hidden' />
                  </button>
                </div>
                <div className='p-3 bg-gray-50 rounded-lg border text-sm'>{outreach.email.email_subject}</div>
              </div>
            )}

            {/* Initial Email Message */}
            {outreach.email.email_message && (
              <div className='group'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-bold text-sm text-gray-700'>Email Message</h4>
                  <button
                    type='button'
                    onClick={() => handleCopy(outreach.email!.email_message)}
                    className='w-8 h-8 rounded-full border-2 border-gray-300 bg-white 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     flex items-center justify-center hover:border-gray-400 cursor-pointer
                     [&:active_svg.copy-icon]:hidden [&:active_svg.check-icon]:block
                     [&:focus_svg.copy-icon]:hidden [&:focus_svg.check-icon]:block'
                    aria-label='Copy email message'
                  >
                    <Copy className='copy-icon w-4 h-4 text-gray-600 block' />
                    <Check className='check-icon w-4 h-4 text-green-600 hidden' />
                  </button>
                </div>
                <div className='p-3 bg-gray-50 rounded-lg border text-sm whitespace-pre-wrap'>
                  {outreach.email.email_message}
                </div>
              </div>
            )}

            {/* Follow-up Email Message */}
            {outreach.email.email_follow_up_message && (
              <div className='group'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-bold text-sm text-gray-700'>Follow-up Email Message</h4>
                  <button
                    type='button'
                    onClick={() => handleCopy(outreach.email!.email_follow_up_message)}
                    className='w-8 h-8 rounded-full border-2 border-gray-300 bg-white 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     flex items-center justify-center hover:border-gray-400 cursor-pointer
                     [&:active_svg.copy-icon]:hidden [&:active_svg.check-icon]:block
                     [&:focus_svg.copy-icon]:hidden [&:focus_svg.check-icon]:block'
                    aria-label='Copy follow-up message'
                  >
                    <Copy className='copy-icon w-4 h-4 text-gray-600 block' />
                    <Check className='check-icon w-4 h-4 text-green-600 hidden' />
                  </button>
                </div>
                <div className='p-3 bg-gray-50 rounded-lg border text-sm whitespace-pre-wrap'>
                  {outreach.email.email_follow_up_message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyOutreach;
