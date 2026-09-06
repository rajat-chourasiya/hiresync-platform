import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Post()
  schedule(@Req() req: any, @Body() dto: ScheduleInterviewDto) {
    return this.interviewsService.schedule(req.user.orgId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.interviewsService.findAll(req.user.orgId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.interviewsService.findOne(req.user.orgId, id);
  }
}