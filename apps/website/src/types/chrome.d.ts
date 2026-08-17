/**
 * Minimal ambient typing for the two `chrome.runtime` calls the website makes
 * (see src/lib/extension-bridge.ts). The full `@types/chrome` package describes
 * the entire extension API surface, none of which a web page can reach — this
 * declares only what is actually available to a page listed in an extension's
 * `externally_connectable`.
 *
 * `chrome` is absent entirely on non-Chromium browsers and on Chromium when no
 * installed extension declares this origin, which is why every consumer must
 * feature-detect before use rather than trusting the type.
 */
declare namespace chrome {
  namespace runtime {
    /** Set by Chrome when a call fails; readable only inside the callback. */
    const lastError: { message?: string } | undefined;

    function sendMessage(
      extensionId: string,
      message: unknown,
      callback: (response: unknown) => void
    ): void;
  }
}
