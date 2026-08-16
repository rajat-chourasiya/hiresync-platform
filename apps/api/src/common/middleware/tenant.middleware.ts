import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { tenantStorage } from '../context/tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    let orgId = '';
    let userId = '';

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = jwt.decode(token) as { orgId?: string; sub?: string };
        orgId = payload?.orgId ?? '';
        userId = payload?.sub ?? '';
      } catch {
        // invalid token — auth guard will reject later, don't block here
      }
    }

    tenantStorage.run({ orgId, userId }, () => next());
  }
}