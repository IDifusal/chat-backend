import { Module } from '@nestjs/common';
import { GptController } from './gpt.controller';
import { GptService } from './gpt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from './schema/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [GptController],
  providers: [GptService],
})
export class GptModule {}
