import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  checkCompleteStatusUseCase,
  createMessageUseCase,
  createRunUseCase,
  createThreadUseCase,
  getMessageListUseCase,
} from './use-cases';
import { QuestionDto } from './dtos/question.dtos';
@Injectable()
export class GptService {
  private openai = new OpenAI({
    apiKey: process.env.OPEN_API_KEY_API,
  });
  async createThread() {
    return await createThreadUseCase(this.openai);
  }
  async userQuestion(questionDto: QuestionDto) {
    const { theadId, question } = questionDto;
    const assistantId = 'asst_sqBNPQPw6UUymJGZr4SFslm7';
    await createMessageUseCase(this.openai, {
      theadId,
      question,
    });
    const run = await createRunUseCase(this.openai, { theadId, assistantId });
    await checkCompleteStatusUseCase(this.openai, {
      runId: run.id,
      threadId: theadId,
    });
    const messages = await getMessageListUseCase(this.openai, { theadId });

    return [messages[0]];
  }
}
