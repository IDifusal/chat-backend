import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GptService } from '../../gpt/gpt.service';
import { EmailNotificationService } from './email-notification.service';
import { getCompanyConfig } from '../../config/assistants.config';
import {
  IntakeSubmissionDto,
  IntakeSubmissionResponse,
} from '../dtos/intake.dto';

@Injectable()
export class IntakeService {
  constructor(
    private readonly gptService: GptService,
    private readonly emailService: EmailNotificationService,
  ) {}

  async submitIntake(
    submission: IntakeSubmissionDto,
    company?: string,
  ): Promise<IntakeSubmissionResponse> {
    try {
      // Generate unique submission ID
      const submissionId = uuidv4();
      const companyName = company || submission.company || 'default';

      // Get company configuration
      const companyConfig = getCompanyConfig(companyName);

      // Prepare conversation for summarization
      let conversationText = '';

      if (submission.conversation && submission.conversation.length > 0) {
        // Use the conversation array
        conversationText = submission.conversation
          .map(
            (msg) =>
              `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`,
          )
          .join('\n\n');
      } else if (submission.message) {
        // Use the simple message
        conversationText = `Usuario: ${submission.message}`;
      } else {
        // Create a basic conversation from the form data
        conversationText = this.createConversationFromForm(submission);
      }

      // Generate AI summary of the conversation
      let summary;
      try {
        summary = await this.gptService.summarizeConversation(
          conversationText,
          {
            maxLength: 200,
            language: 'es',
            includeKeyPoints: true,
            company: companyName,
          },
        );
      } catch (error) {
        console.error('Error generating summary:', error);
        summary = {
          summary:
            'No se pudo generar un resumen automático de la conversación.',
          wordCount: 0,
          language: 'es',
          timestamp: new Date().toISOString(),
        };
      }

      // Send email notification to admins
      let notificationSent = false;
      if (
        companyConfig.notification?.email &&
        companyConfig.notification.email.length > 0
      ) {
        try {
          notificationSent = await this.emailService.sendIntakeNotification(
            companyConfig.notification.email,
            {
              clientName: submission.clientName,
              clientEmail: submission.clientEmail,
              clientPhone: submission.clientPhone,
              subject: submission.subject,
              message: submission.message,
              summary: summary.summary,
              submissionId,
              company: companyConfig.name,
              formType: submission.formType,

              source: submission.source || 'website',
            },
          );
        } catch (error) {
          console.error('Error sending email notification:', error);
          notificationSent = false;
        }
      }

      // TODO: Here you could save the submission to database if needed
      // await this.saveSubmissionToDatabase(submission, submissionId, summary);

      return {
        success: true,
        submissionId,
        message: notificationSent
          ? 'Solicitud enviada exitosamente. El equipo será notificado.'
          : 'Solicitud recibida exitosamente.',
        summary: {
          summary: summary.summary,
          wordCount: summary.wordCount,
          language: summary.language,
          timestamp: summary.timestamp,
        },
        notificationSent,
      };
    } catch (error) {
      console.error('Error processing intake submission:', error);
      throw new Error('Error al procesar la solicitud');
    }
  }

  private createConversationFromForm(submission: IntakeSubmissionDto): string {
    const parts = [];

    if (submission.subject) {
      parts.push(`Asunto: ${submission.subject}`);
    }

    if (submission.message) {
      parts.push(`Mensaje: ${submission.message}`);
    }

    if (submission.formType) {
      parts.push(`Tipo de consulta: ${submission.formType}`);
    }

    if (parts.length === 0) {
      parts.push(
        `El usuario ${submission.clientName} ha enviado una solicitud de contacto.`,
      );
    }

    return `Usuario: ${parts.join('\n')}`;
  }

  // Optional: Method to save submission to database
  // private async saveSubmissionToDatabase(
  //   submission: IntakeSubmissionDto,
  //   submissionId: string,
  //   summary: any,
  // ): Promise<void> {
  //   // Implementation depends on your database schema
  //   // You could create an IntakeSubmission model similar to Question
  // }
}
