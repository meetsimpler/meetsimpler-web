import {loadAuth, authData, authErrorMessage, createAuthOperations} from './auth-client.js';
import {byId, showAuthResult, watchFieldValidation} from './auth-view.js';

const status = byId('status');
const operations = createAuthOperations();
const button = byId('save');
watchFieldValidation('password', 'Enter your password.', 'Use a password with at least 6 characters.');
const params = new URLSearchParams(location.hash.slice(1));
history.replaceState(null, '', location.pathname);

function showResult(success, message) {
  showAuthResult({success, message,
    title: success ? 'Password reset successful' : 'Password reset failed',
    next: success
      ? 'Log in again with your new password in the MeetSimpler app or on the website. Use the link below to open the website login page.'
      : 'Try again, or use the login page below to request a new password reset link. Once your password is reset successfully, log in again in the MeetSimpler app or on the website.',
  });
}

try {
  const access = params.get('access_token'), refresh = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !access || !refresh) {
    throw new Error('Open the password reset link from your email. Request a new link from the login page if it expired.');
  }
  let auth;
  await operations.run(async call => {
    ({auth} = await loadAuth({}, operations));
    authData(await call(() => auth.setSession({access_token: access, refresh_token: refresh})));
  });
  button.disabled = false;
  status.textContent = 'Enter a password with at least six characters.';
  byId('reset').onsubmit = async event => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    byId('result').hidden = true;
    status.textContent = 'Saving your new password...';
    try {
      await operations.run(async call => {
        authData(await call(() => auth.updateUser({password: byId('password').value})));
      });
    } catch (error) {
      button.disabled = operations.stopped;
      if (operations.stopped) byId('reset-form').hidden = true;
      showResult(false, 'Password could not be changed. ' +
        authErrorMessage(error, 'Check the password policy or request a new link.'));
      return;
    }
    byId('password').value = '';
    byId('password').disabled = true;
    byId('reset-form').hidden = true;
    showResult(true, 'Password changed successfully.');
    // Revoke the temporary recovery session without delaying completion.
    void auth.signOut({scope: 'local'}).catch(() => {});
  };
} catch (error) {
  byId('reset-form').hidden = true;
  showResult(false, authErrorMessage(error, 'Your recovery link could not be verified. Request a new link from the login page.'));
}
