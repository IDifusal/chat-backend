import { Module } from '@nestjs/common';
import { IntakeController } from './intake.controller';
import { IntakeService } from './services/intake.service';
import { EmailNotificationService } from './services/email-notification.service';
import { GptModule } from '../gpt/gpt.module';

@Module({
  imports: [GptModule],
  controllers: [IntakeController],
  providers: [IntakeService, EmailNotificationService],
  exports: [IntakeService, EmailNotificationService],
})
export class IntakeModule {}
