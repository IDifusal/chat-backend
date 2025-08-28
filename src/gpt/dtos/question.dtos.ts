import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';

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

export class SummarizeConversationDto {
  @IsOptional()
  readonly conversation: any[] | string;

  @IsNumber()
  @IsOptional()
  readonly maxLength?: number;

  @IsString()
  @IsOptional()
  @IsIn(['es', 'en'])
  readonly language?: 'es' | 'en';

  @IsBoolean()
  @IsOptional()
  readonly includeKeyPoints?: boolean;

  @IsString()
  @IsOptional()
  readonly company?: string;
}
