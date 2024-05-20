import OpenAI from 'openai';
//asst_sqBNPQPw6UUymJGZr4SFslm7 CLM
interface Options {
  theadId: string;
  assistantId?: string;
}
export const createRunUseCase = async (openai: OpenAI, options: Options) => {
  const { theadId, assistantId } = options;
  const run = await openai.beta.threads.runs.create(theadId, {
    assistant_id: assistantId,
  });
  console.log('run', run);
  return run;
};
