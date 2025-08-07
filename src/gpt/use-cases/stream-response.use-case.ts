import OpenAI from 'openai';
import { Response } from 'express';

interface StreamOptions {
  threadId: string;
  messages: any[];
  response: Response;
  assistantId?: string;
  model?: string;
}

export const streamResponseUseCase = async (
  openai: OpenAI,
  options: StreamOptions,
): Promise<string> => {
  const { threadId, messages, response, assistantId, model } = options;
  let fullResponse = '';

  try {
    // Send initial status
    response.write(`data: ${JSON.stringify({ status: 'in_progress' })}\n\n`);

    // Create the stream using Chat Completions API for real streaming
    const stream = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini', // Use configured model or default
      messages: messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    // Process the real stream from OpenAI
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      
      if (content) {
        fullResponse += content;
        
        // Send each real chunk as it arrives from OpenAI
        response.write(
          `data: ${JSON.stringify({
            role: 'assistant',
            content: content,
            status: 'streaming',
          })}\n\n`,
        );
      }

      // Check if the stream is complete
      if (chunk.choices[0]?.finish_reason === 'stop') {
        response.write(`data: ${JSON.stringify({ status: 'done' })}\n\n`);
        break;
      }
    }

    response.end();
    return fullResponse;
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
    throw error;
  }
};
