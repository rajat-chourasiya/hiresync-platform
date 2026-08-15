import { Provider } from '@nestjs/common';
import { StreamClient } from '@stream-io/node-sdk';

export const STREAM_CLIENT = 'STREAM_CLIENT';

export const StreamProvider: Provider = {
  provide: STREAM_CLIENT,
  useFactory: () => {
    return new StreamClient(
      process.env.STREAM_API_KEY as string,
      process.env.STREAM_SECRET as string,
    );
  },
};
