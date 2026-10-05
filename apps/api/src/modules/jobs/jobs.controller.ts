import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { GenerateJobDescriptionDto } from './dto/generate-job-description.dto';
import { EditJobDescriptionDto } from './dto/edit-job-description.dto';
import { RegenerateSectionsDto } from './dto/regenerate-sections.dto';

@Controller('jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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

  @Post(':id/generate-description')
  @RequirePermission('jobs.create')
  generateDescription(@Req() req: any, @Param('id') id: string, @Body() dto: GenerateJobDescriptionDto) {
    return this.jobsService.generateDescription(req.user.orgId, id, dto);
  }

  @Post(':id/edit-description')
  @RequirePermission('jobs.create')
  editDescription(@Req() req: any, @Param('id') id: string, @Body() dto: EditJobDescriptionDto) {
    return this.jobsService.editDescription(req.user.orgId, id, req.user.sub, dto.instruction);
  }

  @Post(':id/description/regenerate-sections')
  @RequirePermission('jobs.create')
  regenerateSections(@Req() req: any, @Param('id') id: string, @Body() dto: RegenerateSectionsDto) {
    return this.jobsService.regenerateSections(req.user.orgId, id, req.user.sub, dto.sectionTypes);
  }

  @Patch(':id/description')
  @RequirePermission('jobs.create')
  updateDescriptionManual(@Req() req: any, @Param('id') id: string, @Body() body: unknown) {
    return this.jobsService.updateDescriptionManual(req.user.orgId, id, req.user.sub, body);
  }

  @Get(':id/description-versions')
  @RequirePermission('jobs.create')
  listVersions(@Req() req: any, @Param('id') id: string) {
    return this.jobsService.listVersions(req.user.orgId, id);
  }

  @Post(':id/description-versions/:versionId/restore')
  @RequirePermission('jobs.create')
  restoreVersion(@Req() req: any, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.jobsService.restoreVersion(req.user.orgId, id, req.user.sub, versionId);
  }
}