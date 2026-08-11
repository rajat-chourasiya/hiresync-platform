import { Controller, Post, Body } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';

@Controller('code-execution')
export class CodeExecutionController {
  constructor(private service: CodeExecutionService) {}

  @Post('run')

  run(@Body() body: { language: string; version: string; code: string }) {
    return this.service.run(body.language, body.version, body.code);
  }
}