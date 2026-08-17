import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',

  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  cookieSecret: process.env.COOKIE_SECRET,

  interviewTokenSecret: process.env.INTERVIEW_TOKEN_SECRET,
  interviewTokenExpiryHours:
    Number(process.env.INTERVIEW_TOKEN_EXPIRY_HOURS) || 48,
}));