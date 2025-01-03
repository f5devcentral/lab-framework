import { delay } from '@/lib/utils';

describe('delay', () => {
  jest.useFakeTimers();

  it('should delay for the specified amount of time', async () => {
    const ms = 1000;
    const promise = delay(ms);

    jest.advanceTimersByTime(ms);

    await expect(promise).resolves.toBeUndefined();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
});
