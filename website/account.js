import {loadAuth, authData, authErrorMessage, providers, callbackError, accessRequest, createAuthOperations} from './auth-client.js';
import {byId, clearFieldError, watchFieldValidation, restoreAuthFocus} from './auth-view.js';

const status = byId('status');
const operations = createAuthOperations();
let auth, config, user, signingUp = false, busy = false, ready = false;
const storageKey = 'meetsimpler-web-account';
const accountUrl = new URL('account.html', location.href).href.split(/[?#]/)[0];
watchFieldValidation('email', 'Enter your email address.', 'Enter a valid email address.');
watchFieldValidation('password', 'Enter your password.', 'Use a password with at least 6 characters.');
watchFieldValidation('consent', 'Please accept the Terms first.');
for (const id of ['current-password', 'new-password', 'confirm-password']) {
  watchFieldValidation(id, 'Enter your password.', 'Use a password with at least 6 characters.');
}
watchFieldValidation('delete-confirmation', 'Type DELETE to confirm permanent account deletion.');
function controls(disabled) {
  document.querySelectorAll('main button').forEach(button => {button.disabled = disabled;});
}
function showDeletionConfirmation(show) {
  byId('delete-account').hidden = !show;
  byId('show-delete-account').hidden = show;
  byId('delete-confirmation').value = '';
  clearFieldError('delete-confirmation');
}
function setAuthMode(signUp) {
  for (const id of ['email', 'password', 'consent']) clearFieldError(id);
  signingUp = signUp;
  byId('auth-title').textContent = byId('submit').textContent = signingUp ? 'Create account' : 'Log in';
  byId('toggle').textContent = signingUp ? 'Already have an account? Log in' : 'Create an account';
  byId('consent-row').hidden = !signingUp;
  byId('consent').required = signingUp;
  byId('password').autocomplete = signingUp ? 'new-password' : 'current-password';
}
function render(nextUser) {
  const changed = user?.id !== nextUser?.id || !!user !== !!nextUser;
  user = nextUser;
  byId('guest').hidden = !!user;
  byId('member').hidden = !user;
  byId('delete-account-section').hidden = !user;
  byId('security').hidden = !user?.identities?.some(identity => identity.provider === 'email');
  byId('account-email').textContent = user?.email || '';
  byId('account-providers').textContent = user?.identities?.map(identity => identity.provider).join(', ') || '';
  if (changed) {
    document.querySelectorAll('input[type=password]').forEach(input => {
      input.value = ''; clearFieldError(input.id);
    });
    showDeletionConfirmation(false);
    if (ready) byId(user ? 'account-title' : 'auth-title').focus();
  }
}
async function run(action) {
  if (!ready || busy) return;
  const focused = document.activeElement;
  busy = true; controls(true); status.textContent = 'Working...';
  try {await operations.run(action);}
  catch (error) {
    if (operations.stopped) stopAuth();
    status.textContent = authErrorMessage(error, 'Unable to complete this request. Please try again.') +
      (operations.stopped ? ' Reload this page to try again.' : '');
  }
  finally {
    busy = false; controls(!ready);
    if (ready) restoreAuthFocus(focused);
  }
}
function stopAuth() {
  ready = false;
  void auth?.stopAutoRefresh?.().catch(() => {});
}
byId('toggle').onclick = () => {
  setAuthMode(!signingUp);
  status.textContent = ''; byId('password').value = '';
};
byId('credentials').onsubmit = event => {
  event.preventDefault();
  if (!byId('credentials').reportValidity()) return;
  return run(async call => {
    const credentials = {email: byId('email').value.trim(), password: byId('password').value};
    const data = authData(await call(() => signingUp
      ? auth.signUp({...credentials, options: {emailRedirectTo: accountUrl}})
      : auth.signInWithPassword(credentials)));
    setAuthMode(false);
    render(data.session?.user || null);
    byId('password').value = '';
    status.textContent = data.session ? 'You are signed in.' : 'Check your email for a confirmation link. Then log in here.';
  });
};
byId('forgot').onclick = () => {
  if (!byId('email').reportValidity()) return;
  return run(async call => {
    authData(await call(() => auth.resetPasswordForEmail(byId('email').value.trim(), {
      redirectTo: new URL('reset-password.html', accountUrl).href,
    })));
    status.textContent = 'If this email has an account, a password reset link will arrive shortly.';
  });
};
for (const provider of Object.keys(providers)) byId(provider).onclick = () => run(async call => {
  authData(await call(() => auth.signInWithOAuth({provider, options: {redirectTo: accountUrl}})));
});
for (const [id, scope] of [['logout', 'local'], ['logout-all', 'global']]) byId(id).onclick = () => run(async call => {
  authData(await call(() => auth.signOut({scope}))); render(null); status.textContent = 'You are signed out.';
});
byId('show-delete-account').onclick = () => {
  if (!ready || busy || !user) return;
  showDeletionConfirmation(true);
  byId('delete-confirmation').focus();
};
byId('cancel-delete-account').onclick = () => {
  if (busy) return;
  showDeletionConfirmation(false);
  byId('show-delete-account').focus();
};
byId('delete-account').onsubmit = event => {
  event.preventDefault();
  return run(async call => {
    if (!user) throw new Error('Please log in before deleting your account.');
    if (byId('delete-account').hidden || byId('delete-confirmation').value !== 'DELETE') {
      throw new Error('Type DELETE to confirm permanent account deletion.');
    }
    const {session} = authData(await call(() => auth.getSession()));
    if (!session?.access_token || session.user?.id !== user.id) {
      throw new Error('Your session has expired. Please log in again.');
    }
    const result = await call(async () => {
      const response = await accessRequest(config, 'deleteAccount', {confirmation: 'DELETE'}, session.access_token, operations.signal);
      return response.json();
    });
    if (result.deleted !== true) throw new Error('Account deletion could not be confirmed. Please try again.');
    // Deletion is terminal for this page. The server already revoked sessions;
    // clear browser storage directly without another network logout request.
    stopAuth();
    localStorage.removeItem(storageKey);
    render(null);
    byId('guest').hidden = true;
    byId('deleted-account').hidden = false;
    status.textContent = 'Your account has been permanently deleted. Meeting files on your computer have been kept.';
    byId('deleted-account-title').focus();
  });
};
byId('change-password').onsubmit = event => {
  event.preventDefault();
  return run(async call => {
    const password = byId('new-password').value;
    if (password !== byId('confirm-password').value) throw new Error('The new passwords do not match.');
    authData(await call(() => auth.signInWithPassword({email: user.email, password: byId('current-password').value})));
    authData(await call(() => auth.updateUser({password})));
    byId('change-password').reset();
    for (const id of ['current-password', 'new-password', 'confirm-password']) clearFieldError(id);
    status.textContent = 'Your password has been changed.';
  });
};
try {
  const oauthError = callbackError();
  // Web account sessions must never share storage with desktop pairing/recovery.
  await operations.run(async call => {
    ({auth, config} = await loadAuth({storageKey, persistSession: true,
      autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit'}, operations));
    try {
      const {session} = authData(await call(() => auth.getSession()));
      render(session ? authData(await call(() => auth.getUser())).user : null);
    } catch (error) {
      // Both refresh and user verification can reject an expired/deleted session.
      if (![400, 401, 403, 404].includes(error.status)) throw error;
      authData(await call(() => auth.signOut({scope: 'local'})));
      render(null);
    }
  });
  history.replaceState(null, '', location.pathname);
  auth.onAuthStateChange((event, session) => {
    if (!ready || operations.stopped) return;
    render(session?.user || null);
    if (event === 'SIGNED_OUT') status.textContent = 'You are signed out.';
  });
  status.textContent = oauthError ? 'The sign-in link expired or sign-in was cancelled. Please try again.' :
    user ? 'You are signed in.' : 'Log in or create your free account.';
  ready = true;
  controls(false);
} catch (error) {
  stopAuth();
  history.replaceState(null, '', location.pathname);
  status.textContent = authErrorMessage(error, 'Account could not load.') + ' Reload this page to try again.';
  controls(true);
}
