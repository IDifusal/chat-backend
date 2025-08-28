import {
  Controller,
  Post,
  Body,
  HttpStatus,
  Query,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { IntakeService } from './services/intake.service';
import { IntakeSubmissionDto } from './dtos/intake.dto';
import { companyExists } from '../config/assistants.config';

@Controller('intake')
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post('submit')
  async submitIntake(
    @Body() intakeDto: IntakeSubmissionDto,
    @Query('company') company?: string,
  ) {
    try {
      // Validate company if provided
      const targetCompany = company || intakeDto.company;
      if (targetCompany && !companyExists(targetCompany)) {
        throw new BadRequestException(
          `Company '${targetCompany}' not found. Please provide a valid company.`,
        );
      }

      // Validate required fields
      if (!intakeDto.clientName || intakeDto.clientName.trim() === '') {
        throw new BadRequestException('Client name is required.');
      }

      // Validate that we have some form of contact information
      if (!intakeDto.clientEmail && !intakeDto.clientPhone) {
        throw new BadRequestException(
          'Either email or phone number is required.',
        );
      }

      // Validate that we have some content to summarize
      if (!intakeDto.conversation && !intakeDto.message && !intakeDto.subject) {
        throw new BadRequestException(
          'Either conversation, message, or subject is required.',
        );
      }

      // Process the intake submission
      const result = await this.intakeService.submitIntake(
        intakeDto,
        targetCompany,
      );

      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      console.error('Intake submission error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        {
          status: 'error',
          message: 'Error processing intake submission',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test-notification')
  async testNotification(@Query('company') company?: string) {
    try {
      // This is a test endpoint to verify email notifications work
      const testSubmission: IntakeSubmissionDto = {
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        clientPhone: '+1234567890',
        subject: 'Test Notification',
        message:
          'This is a test message to verify email notifications are working correctly.',
        company: company || 'default',
        formType: 'test',

        source: 'api-test',
      };

      const result = await this.intakeService.submitIntake(
        testSubmission,
        company,
      );

      return {
        status: 'success',
        message: 'Test notification sent',
        data: result,
      };
    } catch (error) {
      console.error('Test notification error:', error);
      throw new HttpException(
        {
          status: 'error',
          message: 'Error sending test notification',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
