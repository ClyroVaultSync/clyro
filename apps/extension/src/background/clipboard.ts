const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

async function ensureOffscreenDocument(): Promise<void> {
  const hasDocument = await chrome.offscreen.hasDocument();
  if (hasDocument) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['CLIPBOARD'],
    justification: 'Write a copied vault credential to the system clipboard from the popup.',
  });
}

/** Routes the write through the offscreen document — see src/offscreen/offscreen.ts for why. */
export async function copyToClipboard(text: string): Promise<{ success: boolean }> {
  await ensureOffscreenDocument();
  const response = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY_TEXT', text });
  return (response as { success: boolean } | undefined) ?? { success: false };
}
