import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, Linkedin, Timer, Twitter, Youtube, Facebook, Instagram, ChevronDown } from 'lucide-react';
import type { EnrichedCompany } from 'mira-ai/types';

interface CompanySourcesProps {
  executionTime?: string;
  sources: string[];
  enrichedCompany: EnrichedCompany | null;
}

/**
 * Company Sources Component
 *
 * Displays execution time, sources dropdown, and social media links
 * for the enriched company data.
 */
const CompanySources = ({ executionTime, sources, enrichedCompany }: CompanySourcesProps) => {
  // Renders social media icons with platform-specific styling
  const renderSocialMediaLinks = () => {
    const { socialMediaLinks } = enrichedCompany || {};
    if (!socialMediaLinks || !Array.isArray(socialMediaLinks) || socialMediaLinks.length === 0) return null;

    const getSocialIcon = (url: string) => {
      if (url.includes('linkedin.com')) {
        return <Linkedin className='w-4 h-4 hover:text-blue-600' />;
      } else if (url.includes('twitter.com') || url.includes('x.com')) {
        return <Twitter className='w-4 h-4 hover:text-blue-500' />;
      } else if (url.includes('youtube.com')) {
        return <Youtube className='w-4 h-4 hover:text-red-600' />;
      } else if (url.includes('facebook.com')) {
        return <Facebook className='w-4 h-4 hover:text-blue-700' />;
      } else if (url.includes('instagram.com')) {
        return <Instagram className='w-4 h-4 hover:text-pink-600' />;
      }
      return <Link className='w-4 h-4 hover:text-gray-600' />;
    };

    return (
      <Badge variant='outline' className='flex items-center py-2 px-4'>
        <span className='text-xs mr-2'>Social Profiles:</span>
        <div className='flex items-center space-x-6'>
          {socialMediaLinks.map((url, index) => (
            <a key={index} href={url} target='_blank' rel='noopener noreferrer'>
              {getSocialIcon(url)}
            </a>
          ))}
        </div>
      </Badge>
    );
  };

  return (
    <div className='flex flex-wrap items-center gap-4'>
      {/* Execution time */}
      {executionTime && (
        <div>
          <Badge variant='outline' className='py-2 px-4'>
            <Timer className='w-6 h-6' />
            <span className='text-xs'>Processing Time: </span>
            <b>{executionTime}</b>
          </Badge>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger className='cursor-pointer flex items-center gap-2'>
              <Badge variant='outline' className='py-2 px-4'>
                <Link className='w-4 h-4 mr-1' />
                <span className='text-xs'>Sources</span>
                <ChevronDown className='w-3 h-3 ml-1' />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {sources.map((l, i) => (
                <DropdownMenuItem key={i} asChild>
                  <a
                    href={l}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-2 w-[300px] cursor-pointer'
                    title={l}
                  >
                    {(() => {
                      try {
                        const host = new URL(l).hostname;
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${host}&sz=16`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                            alt=''
                            className='w-4 h-4'
                          />
                        );
                      } catch {
                        return null;
                      }
                    })()}
                    <span className='truncate'>{l}</span>
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Social media links */}
      {renderSocialMediaLinks()}
    </div>
  );
};

export default CompanySources;
