import { Module } from '@nestjs/common';
import { GptModule } from './gpt/gpt.module';
import { IntakeModule } from './intake/intake.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';

@Module({
  imports: [
    GptModule,
    IntakeModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ assistants: require('./config/assistants.config') })],
    }),
    MongooseModule.forRoot(process.env.MONGO_URL),
  ],
  controllers: [AppController],
})
export class AppModule {}
