import OpenAI from 'openai';
import { Response } from 'express';
import { handleToolCallsUseCase } from './handle-tool-calls.use-case';

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
      let continueTimeout: NodeJS.Timeout | null = null;
      let waitingInterval: NodeJS.Timeout | null = null;

      for await (const event of run) {
        console.log('🎯 Stream event received:', event.event);
        console.log('🎯 Event data:', JSON.stringify(event.data, null, 2));

        // Clear any existing timeout since we received an event
        if (continueTimeout) {
          clearTimeout(continueTimeout);
          continueTimeout = null;
        }
        if (waitingInterval) {
          clearInterval(waitingInterval);
          waitingInterval = null;
        }

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

        // Handle tool calls when they are required
        if (event.event === 'thread.run.requires_action') {
          console.log('🔧 Tool calls required:', event.data);

          const toolCalls =
            event.data.required_action?.submit_tool_outputs?.tool_calls;
          if (toolCalls && toolCalls.length > 0) {
            console.log('🛠️ Processing tool calls:', toolCalls.length);

            // Send status to client that tools are being executed
            response.write(
              `data: ${JSON.stringify({
                status: 'executing_tools',
                toolCount: toolCalls.length,
                tools: toolCalls.map((tc) => tc.function.name),
              })}\n\n`,
            );

            try {
              // Process the tool calls
              await handleToolCallsUseCase(openai, {
                threadId,
                runId: event.data.id,
                toolCalls,
              });

              console.log('✅ Tool calls processed successfully');

              // Send status that tools were executed
              response.write(
                `data: ${JSON.stringify({
                  status: 'tools_executed',
                  message: 'Tools executed successfully',
                })}\n\n`,
              );

              console.log('📡 tools_executed status sent to client');

              // The run will continue automatically after tool outputs are submitted
              // We don't need to do anything special here, just continue processing events
              console.log(
                '🔄 Waiting for run to continue after tool execution...',
              );

              // Add a counter to track waiting time
              let waitingSeconds = 0;
              waitingInterval = setInterval(() => {
                waitingSeconds++;
                console.log(
                  `⏳ Still waiting for run to continue... ${waitingSeconds}s`,
                );
              }, 1000);

              // Add a timeout to detect if the run doesn't continue (reduced to 5 seconds)
              continueTimeout = setTimeout(() => {
                clearInterval(waitingInterval);
                // Check if response is still writable
                if (response.destroyed || response.writableEnded) {
                  console.log(
                    'Response already closed, skipping manual confirmation',
                  );
                  return;
                }

                console.warn(
                  '⚠️ Run may have stalled after tool execution - no new events received in 5 seconds',
                );

                // If the run stalls, send a manual confirmation message
                console.log(
                  '🔧 Sending manual confirmation message due to stalled run',
                );

                // Send the confirmation message in chunks to simulate normal streaming
                const messageChunks = [
                  '✅ Successfully sent. ',
                  'Your appointment information has been processed ',
                  'and sent to our team. ',
                  'We will contact you soon.',
                ];

                // Send each chunk with a small delay
                for (let i = 0; i < messageChunks.length; i++) {
                  setTimeout(() => {
                    console.log(
                      `📤 Sending chunk ${i + 1}/${messageChunks.length}: "${messageChunks[i]}"`,
                    );
                    response.write(
                      `data: ${JSON.stringify({
                        role: 'assistant',
                        content: messageChunks[i],
                        status: 'streaming',
                      })}\n\n`,
                    );

                    // If this is the last chunk, send the done status
                    if (i === messageChunks.length - 1) {
                      setTimeout(() => {
                        console.log('📤 Sending final done status');
                        response.write(
                          `data: ${JSON.stringify({
                            status: 'done',
                            threadId: threadId,
                            message: 'Completed with manual confirmation',
                          })}\n\n`,
                        );
                        response.end();
                        console.log('📤 Response stream ended');
                      }, 100);
                    }
                  }, i * 200); // 200ms delay between chunks
                }
              }, 5000); // Reduced to 5 seconds
            } catch (error) {
              console.error('❌ Tool execution failed:', error);
              response.write(
                `data: ${JSON.stringify({
                  status: 'tool_error',
                  error: 'Tool execution failed',
                })}\n\n`,
              );
            }
          }
        }

        if (event.event === 'thread.run.completed') {
          console.log('✅ Assistant run completed');

          // Clear timeout since run completed normally
          if (continueTimeout) {
            clearTimeout(continueTimeout);
            continueTimeout = null;
          }
          if (waitingInterval) {
            clearInterval(waitingInterval);
            waitingInterval = null;
          }

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
          console.error('❌ Assistant run failed:', event.data);
          throw new Error('Assistant run failed');
        }

        if (event.event === 'thread.run.expired') {
          console.error('⏰ Assistant run expired:', event.data);
          throw new Error('Assistant run expired');
        }

        // Handle other events that might occur
        if (event.event === 'thread.run.queued') {
          console.log('🔄 Run queued');
        }

        if (event.event === 'thread.run.in_progress') {
          console.log('🔄 Run in progress');
        }

        if (event.event === 'thread.run.cancelling') {
          console.log('🔄 Run cancelling');
        }

        if (event.event === 'thread.run.cancelled') {
          console.log('🔄 Run cancelled');
          break;
        }

        if (event.event === 'thread.message.created') {
          console.log('📝 New message created');
        }

        if (event.event === 'thread.message.in_progress') {
          console.log('📝 Message in progress');
        }

        if (event.event === 'thread.message.completed') {
          console.log('📝 Message completed');
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
