// @types/chrome@0.2.2 predates the chrome.offscreen API (Chrome 109+). This is a
// minimal ambient declaration covering only what this project uses; remove once
// @types/chrome ships real offscreen typings.
declare namespace chrome.offscreen {
  type Reason = 'CLIPBOARD';

  interface CreateParameters {
    url: string;
    reasons: Reason[];
    justification: string;
  }

  function createDocument(parameters: CreateParameters): Promise<void>;
  function closeDocument(): Promise<void>;
  function hasDocument(): Promise<boolean>;
}
