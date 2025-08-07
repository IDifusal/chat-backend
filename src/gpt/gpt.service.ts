import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { InjectModel } from '@nestjs/mongoose';
import {
  checkCompleteStatusUseCase,
  createMessageUseCase,
  createAssistantMessageUseCase,
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

    // Get assistant configuration
    const assistantConfig = this.getAssistantConfig({ company });
    
    try {
      // Get conversation history from the thread
      const messages = await openai.beta.threads.messages.list(currentThreadId, {
        order: 'asc'
      });

      // Convert thread messages to chat completion format
      const chatMessages = [
        {
          role: 'system',
          content: assistantConfig.instructions || 'You are a helpful assistant.'
        },
        ...messages.data.map(msg => ({
          role: msg.role,
          content: msg.content
            .filter(block => block.type === 'text')
            .map(block => {
              if (block.type === 'text' && 'text' in block) {
                return block.text.value;
              }
              return '';
            })
            .join('\n')
        })),
        {
          role: 'user',
          content: question
        }
      ];

      // First, save user message to thread
      await createMessageUseCase(openai, {
        theadId: currentThreadId,
        question,
      });

      // Stream the response immediately using real OpenAI streaming
      const assistantResponse = await streamResponseUseCase(openai, {
        threadId: currentThreadId,
        messages: chatMessages,
        response,
        assistantId: assistantConfig.id,
        model: assistantConfig.model,
      });

      // Save assistant response to thread (in background to not delay response)
      setImmediate(async () => {
        try {
          if (assistantResponse) {
            await createAssistantMessageUseCase(openai, {
              threadId: currentThreadId,
              content: assistantResponse,
            });
          }
        } catch (error) {
          console.error('Error saving assistant message to thread:', error);
        }
      });

      // Save to database and WordPress (in background)
      setImmediate(async () => {
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
          console.error('Error saving conversation:', error);
        }
      });

    } catch (error) {
      console.error('Stream question error:', error);
      
      // Send error to client
      response.write(
        `data: ${JSON.stringify({
          status: 'error',
          message: 'Error processing your question',
        })}\n\n`,
      );
      response.end();
    }
  }
}
