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

const authMessages = {
  invalid_credentials: 'Email or password is incorrect. Check your details and try again.',
  email_not_confirmed: 'Confirm your email using the link in your inbox, then log in.',
  weak_password: 'Choose a stronger password that meets the password requirements.',
  same_password: 'Choose a password different from your current password.',
  user_already_exists: 'An account with these details already exists. Log in or reset your password.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
  over_email_send_rate_limit: 'Too many emails requested. Wait a few minutes before requesting another email.',
  otp_expired: 'This sign-in link has expired or has already been used. Request a new link.',
};

export function authErrorMessage(error, fallback) {
  if (Object.hasOwn(authMessages, error?.code)) return authMessages[error.code];
  if (error?.status === 429) return authMessages.over_request_rate_limit;
  if (error?.status >= 500) return 'The service is unavailable. Please try again.';
  if (error?.name === 'TimeoutError') return 'The request timed out. Reload this page to try again.';
  if (error?.name === 'AuthRetryableFetchError' || error?.name === 'TypeError') {
    return 'Check your internet connection and try again.';
  }
  return error?.message || fallback;
}

export async function accessRequest(config, action, body, token, signal) {
  const response = await timedFetch(config.apiBase.replace(/\/$/, '') + '/' + action, {
    method: 'POST', headers: {'Content-Type': 'application/json',
      apikey: config.supabase.publishableKey, Authorization: 'Bearer ' + token},
    body: JSON.stringify(body), signal,
  });
  if (!response.ok) {
    const message = response.status === 401 ? 'Your session has expired. Please log in again.'
      : response.status === 403 ? 'Account access was denied. Please sign in again.'
      : 'The service is unavailable. Please try again.';
    throw Object.assign(new Error(message), {status: response.status});
  }
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
