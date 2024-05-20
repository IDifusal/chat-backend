import { Controller, Post, Body } from '@nestjs/common';
import { GptService } from './gpt.service';
import { QuestionDto } from './dtos/question.dtos';
@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}

  @Post('create-thread')
  async createThrea() {
    return this.gptService.createThread();
  }

  @Post('user-question')
  async userQuestion(@Body() questionDto: QuestionDto) {
    return await this.gptService.userQuestion(questionDto);
  }
}
