import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { GptService } from './gpt.service';
import { QuestionDto, SummarizeConversationDto } from './dtos/question.dtos';
import { Response } from 'express';
import { companyExists, getAssistantConfig } from '../config/assistants.config';

@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}

  @Post('create-thread')
  async createThread(@Query('company') company?: string) {
    if (!company) {
      throw new BadRequestException(
        'Company parameter is required. Please provide a valid company.',
      );
    }

    if (!companyExists(company)) {
      throw new BadRequestException(
        `Company '${company}' not found. Please provide a valid company.`,
      );
    }

    const thread = await this.gptService.createThread({ company });
    const assistantConfig = getAssistantConfig(company);

    return {
      threadId: thread.id,
      messages: assistantConfig.predefinedMessages || [],
      assistantName: assistantConfig.name,
    };
  }

  @Post('user-question')
  async userQuestion(
    @Body() questionDto: QuestionDto,
    @Query('company') company?: string,
  ) {
    // Validate company if provided
    if (company && !companyExists(company)) {
      throw new BadRequestException(
        `Company '${company}' not found. Please provide a valid company.`,
      );
    }

    return await this.gptService.userQuestion(questionDto, { company });
  }

  @Post('stream-question')
  async streamQuestion(
    @Body() questionDto: QuestionDto,
    @Res() response: Response,
  ) {
    try {
      console.log('Received stream request:', questionDto);

      // Validate company if provided
      if (questionDto.company && !companyExists(questionDto.company)) {
        // For streaming endpoints, we need to handle the error differently
        // since we're using SSE and response object directly
        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');
        response.setHeader('Access-Control-Allow-Origin', '*');

        response.write(
          `data: ${JSON.stringify({
            status: 'error',
            message: `Company '${questionDto.company}' not found. Please provide a valid company.`,
          })}\n\n`,
        );
        response.end();
        return;
      }

      // Set up SSE headers
      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('Access-Control-Allow-Origin', '*');

      await this.gptService.streamQuestion(questionDto, response);
    } catch (error) {
      console.error('Stream error:', error);
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          status: 'error',
          message: 'Failed to stream response',
        });
      } else {
        // If headers were already sent, send error as SSE
        response.write(
          `data: ${JSON.stringify({
            status: 'error',
            message: 'Error during streaming',
          })}\n\n`,
        );
        response.end();
      }
    }
  }

  @Post('summarize-conversation')
  async summarizeConversation(@Body() summarizeDto: SummarizeConversationDto) {
    try {
      // Validate company if provided
      if (summarizeDto.company && !companyExists(summarizeDto.company)) {
        throw new BadRequestException(
          `Company '${summarizeDto.company}' not found. Please provide a valid company.`,
        );
      }

      const result = await this.gptService.summarizeConversation(
        summarizeDto.conversation,
        {
          maxLength: summarizeDto.maxLength,
          language: summarizeDto.language,
          includeKeyPoints: summarizeDto.includeKeyPoints,
          company: summarizeDto.company,
        },
      );

      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      console.error('Summarize conversation error:', error);
      throw new BadRequestException('Failed to summarize conversation');
    }
  }
}
