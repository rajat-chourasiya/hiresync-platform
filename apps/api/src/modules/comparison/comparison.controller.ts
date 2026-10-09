import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ComparisonService } from './comparison.service';
import { CompareCandidatesQueryDto } from './dto/compare-candidates-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('jobs/:jobId/compare')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ComparisonController {
  constructor(private comparisonService: ComparisonService) {}

  @Get()
  @RequirePermission('applications.view')
  compare(@Req() req: any, @Param('jobId') jobId: string, @Query() query: CompareCandidatesQueryDto) {
    const candidateIds = query.candidateIds.split(',').map((id) => id.trim());
    return this.comparisonService.compare(req.user.orgId, jobId, candidateIds);
  }
}