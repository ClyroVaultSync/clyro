// One wording for both ways to disconnect — the Options page's Disconnect and the
// popup's Change Storage Options — since the second is a shortcut to the first,
// not a separate, weaker path.
const DISCONNECT_WARNING =
  "Disconnect this storage provider? Your vault stays where it is — export it first if you don't have a backup, since reconnecting will need either the same provider again or an import.";

/**
 * The confirm text for disconnecting. Changes still waiting to sync exist only
 * on this device and are discarded on disconnect, so the text says how many.
 */
export async function getDisconnectWarning(): Promise<string> {
  const res = await chrome.runtime.sendMessage({ type: "GET_SYNC_STATUS" });
  const pending: number = res?.success ? res.data.pendingCount : 0;
  if (pending === 0) return DISCONNECT_WARNING;

  const lost =
    pending === 1
      ? "1 change saved on this device hasn't synced yet and will be lost. Export first to keep it."
      : `${pending} changes saved on this device haven't synced yet and will be lost. Export first to keep them.`;
  return `${DISCONNECT_WARNING}\n\n${lost}`;
}
