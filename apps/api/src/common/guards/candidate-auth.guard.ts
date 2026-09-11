import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CandidateAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('No token provided');

    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, process.env.CANDIDATE_SESSION_SECRET as string) as {
        candidateId: string;
        orgId: string;
        type: string;
      };
      if (payload.type !== 'candidate') throw new Error('Invalid token type');
      req.candidate = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired candidate session');
    }
  }
}