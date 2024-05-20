import { IsString } from 'class-validator';

export class QuestionDto {
  @IsString()
  readonly theadId: string;
  @IsString()
  readonly question: string;
}
