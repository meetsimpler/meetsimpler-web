export function timedFetch(url, options = {}) {
  const timeout = AbortSignal.timeout(20000);
  return fetch(url, {...options, signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout});
}

export async function request(url, options = {}) {
  const response = await timedFetch(url, options);
  if (!response.ok) throw new Error('The service is unavailable. Please try again.');
  return response;
}
