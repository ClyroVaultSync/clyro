import type { LegalDocument } from './types';

/**
 * Every claim here is checked against how the site and product actually behave.
 * If any of the following changes, this file must change with it:
 *   - the single sessionStorage key in components/IntroGate.tsx
 *   - the bridge message union in packages/shared-types (status only, no secrets)
 *   - the absence of any analytics/telemetry script in app/layout.tsx
 */
export const privacyDocument: LegalDocument = {
  title: 'Privacy Policy',
  subtitle:
    'Clyro has no accounts, no servers and no analytics, so this page is mostly a list of things that do not happen.',
  lastUpdated: '2026-08-18',
  sections: [
    {
      id: 'summary',
      title: 'The short version',
      blocks: [
        {
          kind: 'p',
          text: 'Clyro does not have user accounts, does not run a server that your data passes through, and does not collect analytics or telemetry. There is no database of Clyro users, because there is no way to become one.'
        },
        {
          kind: 'note',
          variant: 'neutral',
          title: 'We cannot read your passwords — structurally, not as a promise',
          text: 'Your vault is encrypted on your own device with a key derived from your master password. That key never leaves the device, and neither does your master password. Whichever storage you choose only ever receives an encrypted blob it cannot open.'
        }
      ]
    },
    {
      id: 'no-account',
      title: 'There is no Clyro account',
      blocks: [
        {
          kind: 'p',
          text: 'Most password managers ask you to register, then store your vault on their infrastructure. Clyro does neither. You install a browser extension and choose where your vault lives: a small sync server you run yourself, or your own Google Drive or Dropbox account.'
        },
        {
          kind: 'p',
          text: 'Because there is no account, there is no email address, no password reset, no billing record and no profile for us to hold, lose, or be compelled to hand over.'
        }
      ]
    },
    {
      id: 'website-data',
      title: 'What this website stores',
      blocks: [
        {
          kind: 'p',
          text: 'This site is a set of static pages plus a launcher for the extension. It sets no tracking cookies, embeds no analytics or advertising scripts, and has no server-side session.'
        },
        {
          kind: 'p',
          text: 'The only thing it writes to your browser is a single sessionStorage entry recording that you have already seen the intro animation, so it does not replay on every page. It is cleared when you close the tab and contains no identifier.'
        },
        {
          kind: 'p',
          text: 'The password generator runs entirely in your browser using the built-in Web Crypto API. Generated passwords are never transmitted anywhere and are not stored.'
        }
      ]
    },
    {
      id: 'extension-communication',
      title: 'What the website and extension say to each other',
      blocks: [
        {
          kind: 'p',
          text: 'The Dashboard can ask the extension two questions, and only two: whether it is installed and what state it is in, and whether it will open its own vault tab. The reply carries three pieces of information — installed, which storage provider is selected, and whether the vault is currently locked.'
        },
        {
          kind: 'note',
          variant: 'neutral',
          title: 'No credential can cross this channel',
          text: 'The message format shared by the website and the extension has no field capable of holding a password, master password, encryption key, or decrypted vault. This is enforced by the shared type definition, not by convention, and the vault interface itself lives inside the extension rather than on this site.'
        }
      ]
    },
    {
      id: 'storage-providers',
      title: 'What your storage provider can see',
      blocks: [
        {
          kind: 'p',
          text: 'You choose where your encrypted vault is stored. What that provider can observe depends on which one you pick, and in every case it is metadata rather than contents:'
        },
        {
          kind: 'list',
          items: [
            'Local Sync Server — software you run on your own machine or your own server. Nothing leaves your control.',
            'Google Drive — an encrypted file in your private application folder. Google can see the file exists, its size, and when it changed. It cannot decrypt it.',
            'Dropbox — the same arrangement using Dropbox’s file API. Dropbox can see the file exists, its size, and when it changed. It cannot decrypt it.'
          ]
        },
        {
          kind: 'p',
          text: 'Your relationship with Google or Dropbox is governed by their own privacy policies. Clyro is not a party to it and receives nothing from it.'
        }
      ]
    },
    {
      id: 'autofill',
      title: 'Autofill and the sites you visit',
      blocks: [
        {
          kind: 'p',
          text: 'To offer autofill, the extension needs to detect login forms on pages you visit. That detection happens locally, in your browser, and produces no record that is sent anywhere. Clyro does not build a history of the sites you visit and has nowhere to send one.'
        }
      ]
    },
    {
      id: 'recovery',
      title: 'Recovery, and why there is none',
      blocks: [
        {
          kind: 'note',
          variant: 'warning',
          title: 'If you lose your master password, your vault is unrecoverable',
          text: 'This is a direct consequence of the design: nobody but you holds a key, so nobody but you can open the vault. There is no reset link, no support override, and no backdoor. Keep an encrypted export somewhere safe.'
        }
      ]
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      blocks: [
        {
          kind: 'p',
          text: 'If this policy changes, the date at the top of this page changes with it, and the change is visible in the public commit history of the repository. There is no mailing list to notify, because there are no addresses to notify.'
        }
      ]
    }
  ]
};
