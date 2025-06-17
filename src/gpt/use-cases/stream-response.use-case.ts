import OpenAI from 'openai';
import { Response } from 'express';

interface StreamOptions {
  threadId: string;
  runId: string;
  response: Response;
}

export const streamResponseUseCase = async (
  openai: OpenAI,
  options: StreamOptions,
) => {
  const { threadId, runId, response } = options;

  try {
    // First, poll until the run is completed or fails
    let run = await openai.beta.threads.runs.retrieve(threadId, runId);

    // Send the initial status
    response.write(`data: ${JSON.stringify({ status: run.status })}\n\n`);

    // Poll until the run is completed or fails
    while (run.status === 'queued' || run.status === 'in_progress') {
      // Wait a bit between polls
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check the status again
      run = await openai.beta.threads.runs.retrieve(threadId, runId);

      // Send status updates to the client
      response.write(`data: ${JSON.stringify({ status: run.status })}\n\n`);
    }

    if (run.status === 'completed') {
      // Once completed, stream the messages
      const messages = await openai.beta.threads.messages.list(threadId, {
        limit: 1,
        order: 'desc',
      });

      // Get the latest assistant message
      const latestMessage = messages.data.find(
        (msg) => msg.role === 'assistant',
      );

      if (latestMessage) {
        // Extract and stream content
        for (const contentBlock of latestMessage.content) {
          if (contentBlock.type === 'text') {
            // Break up the message into smaller chunks to simulate streaming
            const text = contentBlock.text.value;
            const chunks = text.split(' ');

            for (const chunk of chunks) {
              // Send each chunk as a separate SSE message
              response.write(
                `data: ${JSON.stringify({
                  role: 'assistant',
                  content: chunk + ' ',
                  status: 'streaming',
                })}\n\n`,
              );

              // Add a small delay to simulate streaming
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        }
      }

      // Signal end of stream
      response.write(`data: ${JSON.stringify({ status: 'done' })}\n\n`);
    } else if (run.status === 'failed') {
      // Send error to client
      response.write(
        `data: ${JSON.stringify({
          status: 'error',
          message: 'Assistant run failed',
        })}\n\n`,
      );
    }

    response.end();
  } catch (error) {
    console.error('Streaming error:', error);

    // Send error to client
    response.write(
      `data: ${JSON.stringify({
        status: 'error',
        message: 'Error during streaming',
      })}\n\n`,
    );

    response.end();
  }
};
