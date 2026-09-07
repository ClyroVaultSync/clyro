import type { BackgroundMessage, BackgroundResponse } from '../background/messages';

/**
 * Non-visual autofill logic: detects login forms, asks the background worker for matching
 * credentials, and stashes newly-entered credentials worth saving for AutofillUI to pick up.
 * Renders nothing itself — the dropdown dispatches a CustomEvent on `window` that AutofillUI
 * listens for; the save-prompt banner instead goes through the background worker's pending-
 * credential stash (see handleFormSubmit below and AutofillUI's mount effect) since it must
 * survive a page navigation that a same-page event cannot.
 */

const CREDENTIALS_FOUND_EVENT = 'clyro:credentials-found';

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

/**
 * A real form submit starts navigating to the next page immediately, well before an async
 * round-trip to the background worker (to check whether this is a new credential) could
 * resolve — so that check, and any UI dispatched from its result, can't happen on this page.
 * This only stashes the raw values (fire-and-forget); whichever page loads next claims and
 * shows it, via AutofillUI's own mount-time check (see its comment for why that check lives
 * there, and why it's the *only* place this stash is consumed). An earlier version of this
 * also tried an immediate check-and-show here for pages that don't navigate away — but since
 * consuming the stash is a one-shot read, that immediate attempt could win the race to consume
 * it while still losing the race to render before an unload that follows shortly after,
 * silently discarding the credential instead of leaving it for the next page. Deferring
 * entirely to the next page load is the trade being made instead: reliable for a real
 * navigation (the reported bug), at the cost of a page that changes state via JavaScript and
 * never truly navigates away not showing the prompt until the user eventually does navigate.
 */
function handleFormSubmit(pair: LoginFieldPair): void {
  const username = pair.usernameField?.value ?? '';
  const password = pair.passwordField.value;
  if (!username || !password) return;

  sendMessage({ type: 'STASH_PENDING_CREDENTIAL', item: { url: window.location.hostname, username, password } }).catch(
    () => {
      // Best-effort — if the page is already mid-unload the message may never get a response.
    }
  );
}

const attachedForms = new WeakSet<HTMLFormElement>();

function attachSubmitListener(pair: LoginFieldPair): void {
  const form = pair.passwordField.form;
  if (!form || attachedForms.has(form)) return;
  attachedForms.add(form);
  form.addEventListener('submit', () => {
    handleFormSubmit(pair);
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
