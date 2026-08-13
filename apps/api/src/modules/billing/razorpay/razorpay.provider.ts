import { Provider } from '@nestjs/common';
import Razorpay from 'razorpay';

export const RAZORPAY = 'RAZORPAY';

export const RazorpayProvider: Provider = {
  provide: RAZORPAY,
  useFactory: () =>
    new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    }),
};