import type { BackgroundMessage, BackgroundResponse } from '../background/messages';

/**
 * Non-visual autofill logic: detects login forms, asks the background worker for
 * matching credentials, and detects newly-entered credentials worth saving.
 * Renders nothing itself — dispatches CustomEvents on `window` that a separate
 * UI layer (dropdown / save-prompt) listens for. Keeping detection and rendering
 * decoupled lets the two be built and merged independently.
 */

const CREDENTIALS_FOUND_EVENT = 'clyro:credentials-found';
const NEW_CREDENTIAL_DETECTED_EVENT = 'clyro:new-credential-detected';

interface LoginFieldPair {
  usernameField: HTMLInputElement | null;
  passwordField: HTMLInputElement;
}

function sendMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(message);
}

function findPasswordFields(root: ParentNode): HTMLInputElement[] {
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[type="password"]'));
}

function isUsernameCandidate(input: HTMLInputElement): boolean {
  const type = input.type.toLowerCase();
  if (type !== 'text' && type !== 'email' && type !== 'tel') return false;
  const autocomplete = (input.autocomplete || '').toLowerCase();
  if (autocomplete === 'username' || autocomplete === 'email') return true;
  return type === 'text' || type === 'email';
}

/** Finds the username/email field associated with a password field: prefers autocomplete hints, falls back to the nearest preceding text/email input in the same form (or document if no form). */
function findUsernameField(passwordField: HTMLInputElement): HTMLInputElement | null {
  const scope: ParentNode = passwordField.form ?? document;
  const candidates = Array.from(scope.querySelectorAll<HTMLInputElement>('input')).filter(isUsernameCandidate);

  const byAutocomplete = candidates.find((input) => {
    const autocomplete = (input.autocomplete || '').toLowerCase();
    return autocomplete === 'username' || autocomplete === 'email';
  });
  if (byAutocomplete) return byAutocomplete;

  const passwordIndex = candidates.length ? Array.from(scope.querySelectorAll('input')).indexOf(passwordField) : -1;
  let nearest: HTMLInputElement | null = null;
  for (const input of candidates) {
    const inputIndex = Array.from(scope.querySelectorAll('input')).indexOf(input);
    if (inputIndex < passwordIndex) nearest = input;
  }
  return nearest ?? candidates[0] ?? null;
}

function scanForLoginFields(): LoginFieldPair[] {
  return findPasswordFields(document).map((passwordField) => ({
    passwordField,
    usernameField: findUsernameField(passwordField),
  }));
}

const attachedFields = new WeakSet<HTMLInputElement>();

/**
 * The FIND_MATCHING_CREDENTIALS round-trip is async, so by the time the response
 * arrives the user may have already tabbed/clicked to a different field. The event
 * carries the originating `field` explicitly (rather than the UI layer inferring it
 * from document.activeElement at dispatch time) so the dropdown never anchors to the
 * wrong input; we also drop the response outright if focus has since moved away.
 */
async function handleFieldFocus(field: HTMLInputElement): Promise<void> {
  const response = await sendMessage({ type: 'FIND_MATCHING_CREDENTIALS', domain: window.location.hostname });
  if (response.success && document.activeElement === field) {
    window.dispatchEvent(new CustomEvent(CREDENTIALS_FOUND_EVENT, { detail: { items: response.data ?? [], field } }));
  }
}

function attachFocusListeners(pair: LoginFieldPair): void {
  for (const field of [pair.usernameField, pair.passwordField]) {
    if (!field || attachedFields.has(field)) continue;
    attachedFields.add(field);
    field.addEventListener('focus', () => void handleFieldFocus(field));
  }
}

async function handleFormSubmit(pair: LoginFieldPair): Promise<void> {
  const username = pair.usernameField?.value ?? '';
  const password = pair.passwordField.value;
  if (!username || !password) return;

  const existing = await sendMessage({ type: 'FIND_MATCHING_CREDENTIALS', domain: window.location.hostname });
  const knownItems = existing.success && Array.isArray(existing.data) ? (existing.data as { username: string }[]) : [];
  const alreadyKnown = knownItems.some((item) => item.username === username);

  if (!alreadyKnown) {
    window.dispatchEvent(
      new CustomEvent(NEW_CREDENTIAL_DETECTED_EVENT, {
        detail: { url: window.location.hostname, username, password, field: pair.passwordField },
      })
    );
  }
}

const attachedForms = new WeakSet<HTMLFormElement>();

function attachSubmitListener(pair: LoginFieldPair): void {
  const form = pair.passwordField.form;
  if (!form || attachedForms.has(form)) return;
  attachedForms.add(form);
  form.addEventListener('submit', () => {
    void handleFormSubmit(pair);
  });
}

function scanAndAttach(): void {
  for (const pair of scanForLoginFields()) {
    attachFocusListeners(pair);
    attachSubmitListener(pair);
  }
}

scanAndAttach();

// Re-scan when the page's DOM changes (SPA login forms rendered after initial load).
const observer = new MutationObserver(() => scanAndAttach());
observer.observe(document.documentElement, { childList: true, subtree: true });
