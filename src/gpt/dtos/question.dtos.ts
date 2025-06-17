import { IsString, IsOptional } from 'class-validator';

export class QuestionDto {
  @IsString()
  @IsOptional()
  readonly threadId?: string;

  @IsString()
  readonly question: string;

  @IsString()
  @IsOptional()
  readonly company?: string;
}
