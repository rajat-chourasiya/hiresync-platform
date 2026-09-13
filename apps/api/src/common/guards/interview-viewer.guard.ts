import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class InterviewViewerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = authHeader.split(' ')[1];

    try {
      const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string);
      req.viewer = { id: payload.sub, type: 'staff', role: payload.role, orgId: payload.orgId };
    } catch {
      try {
        const payload: any = jwt.verify(token, process.env.CANDIDATE_SESSION_SECRET as string);
        req.viewer = { id: payload.candidateId, type: 'candidate', orgId: payload.orgId };
      } catch {
        throw new UnauthorizedException('Invalid session');
      }
    }
    return true;
  }
}