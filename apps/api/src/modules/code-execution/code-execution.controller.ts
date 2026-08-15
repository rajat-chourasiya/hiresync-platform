import { Body, Controller, Post } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import { RunCodeDto } from './dto/run-code.dto';

@Controller('code-execution')
export class CodeExecutionController {
  constructor(
    private readonly service: CodeExecutionService,
  ) {}

  @Post('run')
  run(@Body() body: RunCodeDto) {
    return this.service.run(
      body.language,
      body.version,
      body.code,
    );
  }
}