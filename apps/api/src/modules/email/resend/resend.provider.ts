import { Provider } from '@nestjs/common';
import { Resend } from 'resend';

export const RESEND = 'RESEND';

export const ResendProvider: Provider = {
  provide: RESEND,
  useFactory: () => new Resend(process.env.RESEND_API_KEY),
};
