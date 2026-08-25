import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplyDto } from './dto/apply.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('orgs/:orgId/jobs/:jobSlug/apply')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Post()
  apply(
    @Param('orgId') orgId: string,
    @Param('jobSlug') jobSlug: string,
    @Body() dto: ApplyDto,
  ) {
    return this.applicationsService.apply(orgId, jobSlug, dto);
  }
}