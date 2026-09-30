const browserFetch: typeof globalThis.fetch = (input, options) =>
  globalThis.fetch(input, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(20_000),
  });
export default browserFetch;
export { browserFetch as fetch };
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
