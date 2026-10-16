import {request, timedFetch} from './http.js';
import {validateAuthConfig} from './website-data.js';

// One deadline per foreground operation. A timeout retires this page's client;
// SDK retries may settle later, but cannot send requests or change its session.
export function createAuthOperations() {
  const controller = new AbortController();
  const {signal} = controller;
  async function call(operation) {
    signal.throwIfAborted();
    let abort;
    const cancelled = new Promise((_, reject) => {
      abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, {once: true});
    });
    try {
      const result = await Promise.race([operation(), cancelled]);
      signal.throwIfAborted();
      return result;
    } finally {signal.removeEventListener('abort', abort);}
  }
  return {
    signal, call,
    get stopped() {return signal.aborted;},
    async run(operation) {
      signal.throwIfAborted();
      const timer = setTimeout(() => {
        const error = new Error('The request timed out. Reload this page to try again.');
        error.name = 'TimeoutError';
        controller.abort(error);
      }, 20000);
      try {return await call(() => operation(call));}
      finally {clearTimeout(timer);}
    },
    fetch(url, options = {}) {
      signal.throwIfAborted();
      return timedFetch(url, {...options,
        signal: options.signal ? AbortSignal.any([signal, options.signal]) : signal});
    },
  };
}

export const providers = {google: 'Google', github: 'GitHub'};

export function callbackError() {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  return query.get('error_description') || fragment.get('error_description') ||
    query.get('error') || fragment.get('error');
}

export function authData(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function accessRequest(config, action, body, token, signal) {
  const response = await timedFetch(config.apiBase.replace(/\/$/, '') + '/' + action, {
    method: 'POST', headers: {'Content-Type': 'application/json',
      apikey: config.supabase.publishableKey, Authorization: 'Bearer ' + token},
    body: JSON.stringify(body), signal,
  });
  if (response.status === 403) throw new Error('Account access was denied. Please sign in again.');
  if (!response.ok) throw new Error('The service is unavailable. Please try again.');
  return response;
}

export async function loadAuth(options, operations) {
  const config = validateAuthConfig(await operations.call(async () =>
    (await request('config.json', {signal: operations.signal})).json()));
  let AuthClient;
  try {
    ({AuthClient} = await operations.call(() =>
      import('./vendor/supabase-auth.js')));
  } catch (_) {
    throw new Error('Sign-in could not load. Check your connection and reload this page.');
  }
  // Keep an expired operation from clearing or replacing persistent credentials.
  const storage = options.persistSession && (options.storage || localStorage);
  const guardedStorage = storage && {
    getItem: key => storage.getItem(key),
    setItem: (key, value) => {if (!operations.stopped) storage.setItem(key, value);},
    removeItem: key => {if (!operations.stopped) storage.removeItem(key);},
  };
  const auth = new AuthClient({
    url: config.supabase.url.replace(/\/$/, '') + '/auth/v1',
    headers: {apikey: config.supabase.publishableKey},
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, ...options,
    ...(guardedStorage ? {storage: guardedStorage} : {}),
    fetch: operations.fetch,
  });
  return {auth, config};
}
