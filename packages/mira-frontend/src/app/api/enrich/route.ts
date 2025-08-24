import { NextRequest } from 'next/server';
import { researchCompany, PROGRESS_EVENTS } from 'mira-ai';

/**
 * Company Enrichment API Endpoint
 *
 * Analyzes a company website using AI agents to extract comprehensive business information.
 * Returns Server-Sent Events with real-time progress updates during enrichment.
 */
export async function POST(request: NextRequest) {
  try {
    const { url, companyCriteria } = await request.json();

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
          const event = { type, message, data };
          const eventData = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
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

          // Run enrichment with progress callback
          const result = await researchCompany(url, config, {
            companyCriteria,
            onProgress,
          });

          // Send final result - message will come from orchestrator
          sendEvent(PROGRESS_EVENTS.ENRICHMENT_COMPLETED, undefined, result);

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
