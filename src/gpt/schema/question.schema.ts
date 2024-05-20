// src/question/schemas/question.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Document & Question;

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true })
  threadId: string;

  @Prop({ required: true })
  question: string;

  // Automatically managed createdAt and updatedAt fields
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
