import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@Controller('jobs')
@UseGuards(JwtAuthGuard , PermissionsGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  @RequirePermission('jobs.create')
  create(@Req() req: any, @Body() dto: CreateJobDto) {
    return this.jobsService.create(req.user.orgId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.jobsService.findAll(req.user.orgId);
  }

  @Get(':slug')
  findOne(@Req() req: any, @Param('slug') slug: string) {
    return this.jobsService.findBySlug(req.user.orgId, slug);
  }

  @Patch(':id/publish')
  @RequirePermission('jobs.publish')
  publish(@Req() req: any, @Param('id') id: string) {
    return this.jobsService.publish(req.user.orgId, id);
  }
}