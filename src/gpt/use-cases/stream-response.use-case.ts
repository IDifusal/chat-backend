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
    // Send initial status with threadId for client reference
    response.write(
      `data: ${JSON.stringify({
        status: 'in_progress',
        threadId: threadId,
        assistantId: assistantId,
      })}\n\n`,
    );

    console.log('assistantId', assistantId);

    // Use Assistants API if assistantId is provided, otherwise fallback to Chat Completions
    if (assistantId) {
      // Create a run with the specified assistant
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        stream: true,
      });

      // Process the assistant stream
      for await (const event of run) {
        if (event.event === 'thread.message.delta') {
          const content = event.data.delta.content?.[0];
          if (content?.type === 'text' && content.text?.value) {
            const textContent = content.text.value;
            fullResponse += textContent;

            response.write(
              `data: ${JSON.stringify({
                role: 'assistant',
                content: textContent,
                status: 'streaming',
              })}\n\n`,
            );
          }
        }

        if (event.event === 'thread.run.completed') {
          response.write(
            `data: ${JSON.stringify({
              status: 'done',
              threadId: threadId,
              totalTokens: fullResponse.length,
            })}\n\n`,
          );
          break;
        }

        if (event.event === 'thread.run.failed') {
          throw new Error('Assistant run failed');
        }
      }
    } else {
      // Fallback to Chat Completions API if no assistantId
      const stream = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini', // Use configured model or default
        messages: messages,
        stream: true,
        temperature: 1,
        max_tokens: 2048,
      });

      // Process the chat completion stream
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
          response.write(
            `data: ${JSON.stringify({
              status: 'done',
              threadId: threadId,
              totalTokens: fullResponse.length,
            })}\n\n`,
          );
          break;
        }
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
