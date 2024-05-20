import OpenAI from 'openai';

interface Options {
  theadId: string;
}
export const getMessageListUseCase = async (
  openai: OpenAI,
  options: Options,
) => {
  const { theadId } = options;
  const messageList = await openai.beta.threads.messages.list(theadId);
  console.log(messageList);

  const messages = messageList.data.map((message) => ({
    role: message.role,
    content: message.content.map((content) => (content as any).text.value),
  }));

  return messages;
};
