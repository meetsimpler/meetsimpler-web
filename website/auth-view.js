export const byId = id => document.getElementById(id);

export function restoreAuthFocus(control) {
  if (control && document.activeElement === document.body &&
      !control.disabled && control.getClientRects().length) control.focus();
}

function showFieldError(id, message) {
  byId(id).setAttribute('aria-invalid', 'true');
  const error = byId(id + '-error');
  error.textContent = message;
  error.hidden = false;
}

export function clearFieldError(id) {
  byId(id).removeAttribute('aria-invalid');
  byId(id + '-error').hidden = true;
  byId(id + '-error').textContent = '';
}

export function watchFieldValidation(id, requiredMessage, invalidMessage = requiredMessage) {
  const input = byId(id);
  input.addEventListener('invalid', () => {
    showFieldError(id, input.validity.valueMissing ? requiredMessage : invalidMessage);
  });
  input.addEventListener('input', () => {
    if (input.validity.valid) clearFieldError(id);
  });
}

export function showAuthResult({success, title, next, message, note}) {
  byId('result').hidden = false;
  const heading = byId('result-title');
  heading.textContent = title;
  document.title = title + ' | MeetSimpler';
  byId('result-icon').textContent = success ? '\u2713' : '!';
  byId('result-icon').className = 'result-icon ' + (success ? 'success' : 'failure');
  byId('result-next').textContent = next;
  if (note !== undefined) byId('result-note').textContent = note;
  byId('status').textContent = message;
  heading.focus();
}
