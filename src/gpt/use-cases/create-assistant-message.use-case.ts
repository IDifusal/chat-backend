import OpenAI from 'openai';

interface Options {
  threadId: string;
  content: string;
}

export const createAssistantMessageUseCase = async (
  openai: OpenAI,
  options: Options,
) => {
  const { threadId, content } = options;

  const message = await openai.beta.threads.messages.create(threadId, {
    role: 'assistant',
    content: content,
  });
  return message;
};
