import { Controller, Post, Get, Body, Param, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VideoService } from '../video/video.service';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InterviewsController {
    constructor(private interviewsService: InterviewsService, private videoService: VideoService,) { }

    @Post()
    @RequirePermission('interviews.schedule')
    schedule(@Req() req: any, @Body() dto: ScheduleInterviewDto) {
        return this.interviewsService.schedule(req.user.orgId, dto);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.interviewsService.findAll(req.user.orgId, req.user.sub, req.user.role);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.interviewsService.findOne(req.user.orgId, id);
    }

    @Get(':id/join')
    async join(@Req() req: any, @Param('id') id: string) {
        const interview = await this.interviewsService.findOne(req.user.orgId, id);
        if (!interview) throw new NotFoundException('Interview not found');

        const memberIds = Array.from(new Set([req.user.sub, ...interview.interviewerIds]));

        await this.videoService.createCall(interview.roomId, req.user.sub, memberIds);

        const token = this.videoService.generateUserToken(req.user.sub);

        return {
            roomId: interview.roomId,
            token,
            apiKey: process.env.STREAM_API_KEY,
        };
    }
}