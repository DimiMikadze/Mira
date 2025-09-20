import { NextRequest } from 'next/server';
import { researchCompany, PROGRESS_EVENTS } from 'mira-ai';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/supabase/orm';
import {
  generateOutreach,
  type OutreachConfig,
  type EnrichmentResult as OutreachEnrichmentResult,
} from '@/lib/outreach';
import { OUTREACH_EVENTS } from '@/constants/outreach';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Company Enrichment API Endpoint
 *
 * Analyzes a company website using AI agents to extract comprehensive business information.
 * Returns Server-Sent Events with real-time progress updates during enrichment.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createSupabaseServerClient();
    const authUser = await getAuthUser(supabase);
    if (!authUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { url, sources, analysis, dataPoints, outreach } = await request.json();

    if (!url) {
      return new Response('URL is required', { status: 400 });
    }

    // Validate required environment variables early
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not configured');
      return new Response('OPENAI_API_KEY environment variable is not configured', { status: 500 });
    }

    if (!process.env.SCRAPING_BEE_API_KEY) {
      console.error('SCRAPING_BEE_API_KEY environment variable is not configured');
      return new Response('SCRAPING_BEE_API_KEY environment variable is not configured', { status: 500 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Helper function to send SSE events
        const sendEvent = (type: string, message?: string, data?: unknown) => {
          try {
            const event = { type, message, data };
            const eventData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          } catch (error) {
            console.error('[API] Error serializing SSE event:', error);
            // Send error event instead
            const errorEvent = { type: 'ERROR', message: 'Failed to serialize event data' };
            const errorData = `data: ${JSON.stringify(errorEvent)}\n\n`;
            controller.enqueue(encoder.encode(errorData));
          }
        };

        try {
          // Send initial connection event
          sendEvent(PROGRESS_EVENTS.CONNECTED, 'Connecting to server...');

          // Create progress callback for orchestrator
          const onProgress = (type: string, message?: string) => {
            sendEvent(type, message);
          };

          // Prepare API configuration
          const config = {
            apiKeys: {
              openaiApiKey: process.env.OPENAI_API_KEY!,
              scrapingBeeApiKey: process.env.SCRAPING_BEE_API_KEY!,
            },
          };

          // Default enrichment configuration with all available data points
          const enrichmentConfig = {
            dataPoints,
            sources: {
              crawl: sources?.crawl,
              linkedin: sources?.linkedin,
              google: sources?.google,
            },
            analysis: {
              executiveSummary: analysis?.executiveSummary,
              companyCriteria: analysis?.companyCriteria,
            },
          };

          // Run enrichment with progress callback
          const result = await researchCompany(url, config, {
            onProgress,
            enrichmentConfig,
          });

          // Generate outreach if configured
          let outreachResult = null;
          if (outreach && (outreach.linkedin || outreach.email) && outreach.prompt) {
            try {
              sendEvent(OUTREACH_EVENTS.OUTREACH_STARTED, 'Generating personalized outreach messages...');

              const outreachConfig: OutreachConfig = {
                linkedin: outreach.linkedin || false,
                email: outreach.email || false,
                prompt: outreach.prompt,
              };

              outreachResult = await generateOutreach(result as OutreachEnrichmentResult, outreachConfig);

              sendEvent(OUTREACH_EVENTS.OUTREACH_COMPLETED, 'Outreach messages generated successfully');
            } catch (error) {
              console.error('Error generating outreach:', error);
              sendEvent(OUTREACH_EVENTS.OUTREACH_ERROR, 'Failed to generate outreach messages');
            }
          }

          // Send final result with outreach data
          const finalResult = {
            ...result,
            outreach: outreachResult,
          };

          sendEvent(PROGRESS_EVENTS.ENRICHMENT_COMPLETED, undefined, finalResult);

          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
          sendEvent(PROGRESS_EVENTS.ERROR, errorMessage);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in enrich API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
