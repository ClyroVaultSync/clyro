/**
 * How to install the extension from its zip until it's listed on the Chrome Web
 * Store. Every "Download for Chrome" spot shows these same steps, so they can't
 * drift apart. Each is a full sentence, so they also read well joined together.
 */
export const EXTENSION_INSTALL_STEPS = [
  'Download the extension zip and unzip it.',
  'Open chrome://extensions and turn on Developer mode.',
  'Click Load unpacked and choose the unzipped folder.'
] as const;
