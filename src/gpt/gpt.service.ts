import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { InjectModel } from '@nestjs/mongoose';
import {
  checkCompleteStatusUseCase,
  createMessageUseCase,
  createRunUseCase,
  createThreadUseCase,
  getMessageListUseCase,
  streamResponseUseCase,
} from './use-cases';
import { QuestionDto } from './dtos/question.dtos';
import { Question, QuestionDocument } from './schema/question.schema';
import { Model } from 'mongoose';
import { storeWordpress } from './use-cases/store-wordpress.use-case';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  getAssistantConfig,
  getCompanyConfig,
} from '../config/assistants.config';

interface AssistantOptions {
  company?: string;
}

@Injectable()
export class GptService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    private configService: ConfigService,
  ) {}

  // Get OpenAI client based on assistant config (allows different API keys per assistant)
  private getOpenAIClient(options?: AssistantOptions) {
    const assistantConfig = this.getAssistantConfig(options);
    return new OpenAI({
      apiKey: assistantConfig.apiKey || process.env.OPEN_API_KEY_API,
    });
  }

  // Get assistant configuration
  private getAssistantConfig(options?: AssistantOptions) {
    return getAssistantConfig(options?.company);
  }

  async createThread(options?: AssistantOptions) {
    const openai = this.getOpenAIClient(options);
    return await createThreadUseCase(openai);
  }

  async userQuestion(questionDto: QuestionDto, options?: AssistantOptions) {
    const { question } = questionDto;
    let { threadId: theadId } = questionDto;
    const openai = this.getOpenAIClient(options);

    if (!theadId) {
      theadId = (await this.createThread(options)).id;
    }

    // Get assistant ID from config
    const assistantConfig = this.getAssistantConfig(options);
    const assistantId = assistantConfig.id;

    await createMessageUseCase(openai, {
      theadId,
      question,
    });

    const run = await createRunUseCase(openai, { theadId, assistantId });

    await checkCompleteStatusUseCase(openai, {
      runId: run.id,
      threadId: theadId,
    });

    const messages = await getMessageListUseCase(openai, { theadId });
    const threadId = theadId;

    // Save to database with company/assistant info
    const companyConfig = getCompanyConfig(options?.company);
    const newQuestion = new this.questionModel({
      threadId,
      question,
      company: options?.company || 'default',
      assistant: companyConfig.assistant.name,
    });

    await newQuestion.save();
    storeWordpress({
      threadId,
      question,
      company: options?.company || 'default',
      assistant: companyConfig.assistant.name,
    });

    return [messages[0]];
  }

  async streamQuestion(questionDto: QuestionDto, response: Response) {
    const { question, threadId, company } = questionDto;
    const openai = this.getOpenAIClient({ company });

    // Create thread if doesn't exist
    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = (await this.createThread({ company })).id;
    }

    // Get assistant ID from config
    const assistantConfig = this.getAssistantConfig({ company });
    const assistantId = assistantConfig.id;

    // Create user message
    await createMessageUseCase(openai, {
      theadId: currentThreadId,
      question,
    });

    // Start the run
    const run = await createRunUseCase(openai, {
      theadId: currentThreadId,
      assistantId,
    });

    // Stream the response immediately
    await streamResponseUseCase(openai, {
      threadId: currentThreadId,
      runId: run.id,
      response,
    });

    // After streaming is complete, save to database and WordPress
    try {
      const companyConfig = getCompanyConfig(company);

      // Save to MongoDB
      const newQuestion = new this.questionModel({
        threadId: currentThreadId,
        question,
        company: company || 'default',
        assistant: companyConfig.assistant.name,
      });
      await newQuestion.save();

      // Store to WordPress
      await storeWordpress({
        threadId: currentThreadId,
        question,
        company: company || 'default',
        assistant: companyConfig.assistant.name,
      });
    } catch (error) {
      // Log the error but don't affect the user experience
      console.error('Error saving conversation:', error);
    }
  }
}
