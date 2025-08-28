import {
  IsString,
  IsOptional,
  IsArray,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationMessage {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  timestamp?: string;
}

export class IntakeSubmissionDto {
  @IsString()
  clientName: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  @IsOptional()
  clientPhone?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessage)
  @IsOptional()
  conversation?: ConversationMessage[];

  @IsString()
  @IsOptional()
  threadId?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  formType?: string; // 'consultation', 'support', 'legal', etc.

  @IsString()
  @IsOptional()
  source?: string; // 'website', 'chatbot', 'phone', etc.
}

export interface IntakeSubmissionResponse {
  success: boolean;
  submissionId: string;
  message: string;
  summary?: {
    summary: string;
    wordCount: number;
    language: string;
    timestamp: string;
  };
  notificationSent?: boolean;
}
