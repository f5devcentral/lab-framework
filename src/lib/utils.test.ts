import { delay } from '@/lib/utils';
import { ensureError } from '@/lib/utils';

describe('delay', () => {
  jest.useFakeTimers();

  it('should delay for the specified amount of time', async () => {
    const ms = 1000;
    const promise = delay(ms);

    jest.advanceTimersByTime(ms);

    await expect(promise).resolves.toBeUndefined();
  });

  describe('ensureError', () => {
    it('should return the same error if the input is an instance of Error', () => {
      const error = new Error('Test error');
      const result = ensureError(error);
      expect(result).toBe(error);
    });

    it('should return a new error if the input is not an instance of Error', () => {
      const value = 'Test string';
      const result = ensureError(value);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('This value was thrown as is, not through an Error: "Test string"');
    });

    it('should handle non-stringifiable values gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circularObj: any = {};
      circularObj.self = circularObj;
      const result = ensureError(circularObj);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('This value was thrown as is, not through an Error: [Unable to stringify the thrown value]');
    });
  });
  afterAll(() => {
    jest.useRealTimers();
  });
});
