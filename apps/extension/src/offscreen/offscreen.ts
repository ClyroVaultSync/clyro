/**
 * Hidden extension page that exists solely to write to the system clipboard.
 * navigator.clipboard.writeText() can resolve successfully from inside the
 * action popup without actually delivering the text to the OS clipboard — a
 * known Chromium quirk for that window type. This page doesn't have that
 * problem, so the popup routes copy requests here via the background worker.
 */
chrome.runtime.onMessage.addListener((message: { type?: string; text?: string }, _sender, sendResponse) => {
  if (message?.type !== 'OFFSCREEN_COPY_TEXT') return undefined;
  writeToClipboard(message.text ?? '').then(sendResponse);
  return true;
});

async function writeToClipboard(text: string): Promise<{ success: boolean }> {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return { success: ok };
  }
}
