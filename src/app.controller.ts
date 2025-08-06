import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'chat-backend',
      version: '0.0.1',
      status: 'running',
      message: 'Chat Backend API is currently running',
    };
  }
}
