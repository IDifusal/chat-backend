import OpenAI from 'openai';
interface Options {
  theadId: string;
  question: string;
}
export const createMessageUseCase = async (
  openai: OpenAI,
  options: Options,
) => {
  const { theadId, question } = options;

  const message = await openai.beta.threads.messages.create(theadId, {
    role: 'user',
    content: question,
  });
  return message;
};
