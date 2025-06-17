import { Module } from '@nestjs/common';
import { GptModule } from './gpt/gpt.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    GptModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ assistants: require('./config/assistants.config') })],
    }),
    MongooseModule.forRoot(process.env.MONGO_URL),
  ],
})
export class AppModule {}
