const browserFetch:typeof globalThis.fetch=(...args)=>globalThis.fetch(...args);
export default browserFetch;
export {browserFetch as fetch};
export const Headers=globalThis.Headers;
export const Request=globalThis.Request;
export const Response=globalThis.Response;
