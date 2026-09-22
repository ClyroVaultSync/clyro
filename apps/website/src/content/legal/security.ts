import type { LegalDocument } from './types';

/**
 * The public-facing summary of docs/SECURITY.md. Cryptographic details here
 * (Argon2id, XChaCha20-Poly1305) mirror packages/crypto — if that package's
 * primitives change, this page is wrong until it is updated with them.
 */
export const securityDocument: LegalDocument = {
  title: 'Security',
  subtitle:
    'How Clyro protects your vault, what it deliberately cannot do, and how to report a vulnerability.',
  lastUpdated: '2026-08-18',
  sections: [
    {
      id: 'model',
      title: 'The model in one paragraph',
      blocks: [
        {
          kind: 'p',
          text: 'Your vault is encrypted on your device before it is written anywhere. The key that decrypts it is derived from your master password, exists only in memory while the vault is unlocked, and is never stored or transmitted. Everything downstream — the sync server, Google Drive, Dropbox — handles an opaque blob it has no means to open.'
        }
      ]
    },
    {
      id: 'crypto',
      title: 'Encryption',
      blocks: [
        {
          kind: 'list',
          items: [
            'Key derivation: Argon2id, a memory-hard function chosen specifically to make large-scale guessing of your master password expensive rather than merely slow.',
            'Encryption: XChaCha20-Poly1305, an authenticated cipher — a vault that has been tampered with fails to decrypt rather than decrypting into something subtly wrong.',
            'Salt: each vault carries its own salt, generated once at creation and never changed, so the same master password produces different keys for different vaults.'
          ]
        },
        {
          kind: 'p',
          text: 'All of this runs client-side. No part of it happens on a server, because there is no Clyro server.'
        }
      ]
    },
    {
      id: 'boundary',
      title: 'The trust boundary',
      blocks: [
        {
          kind: 'p',
          text: 'Plaintext credentials, your master password, and the vault key never leave the browser extension. In particular they never enter this website. That is why the vault interface is a page inside the extension rather than something you log into here.'
        },
        {
          kind: 'note',
          variant: 'neutral',
          title: 'Why this matters',
          text: 'An ordinary web page shares its JavaScript context with anything injected into it. Handing decrypted credentials to a web page would put every one of them within reach of a single injected script. Keeping the vault inside the extension removes that class of attack rather than mitigating it.'
        },
        {
          kind: 'p',
          text: 'The only channel between this site and the extension carries three facts — whether the extension is installed, which storage provider is selected, and whether the vault is locked — plus a request to open the extension’s own vault tab. Nothing else can traverse it.'
        }
      ]
    },
    {
      id: 'storage',
      title: 'Storage and sync',
      blocks: [
        {
          kind: 'p',
          text: 'You pick one storage provider. The Local Sync Server runs on hardware you control and authenticates the extension with a pairing token, so other software on the same machine cannot read or overwrite the vault; localhost is not treated as a trust boundary. Google Drive and Dropbox each hold a single encrypted file in your own account.'
        },
        {
          kind: 'p',
          text: 'Concurrent edits are handled with a version number. A stale write is rejected rather than allowed to overwrite the newer vault — atomically where the provider supports a compare-and-swap, and by the extension checking the stored version immediately before writing where it does not. The extension then re-applies your change to the newer vault and saves again, so an edit made on another device is preserved rather than overwritten.'
        }
      ]
    },
    {
      id: 'limits',
      title: 'What Clyro does not protect against',
      blocks: [
        {
          kind: 'p',
          text: 'Being specific about this is more useful than a general reassurance:'
        },
        {
          kind: 'list',
          items: [
            'A compromised device. Malware with access to your browser while the vault is unlocked can read what you can read.',
            'A weak master password. Argon2id raises the cost of guessing; it does not make a short or reused password safe.',
            'Losing your only copy. There is no recovery path by design — keep an encrypted export.',
            'Whoever controls your chosen cloud account. They cannot read your vault, but they can delete the file.'
          ]
        },
        {
          kind: 'note',
          variant: 'warning',
          title: 'No independent audit yet',
          text: 'Clyro has not been through a third-party security audit. The source is public and the cryptographic choices are standard and reviewable, but that is not the same thing as having been audited, and we would rather say so than imply otherwise.'
        }
      ]
    },
    {
      id: 'reporting',
      title: 'Reporting a vulnerability',
      blocks: [
        {
          kind: 'p',
          text: 'If you believe you have found a security issue, report it privately first through the repository’s security advisory page rather than opening a public issue, so a fix can ship before the details are public.'
        },
        {
          kind: 'p',
          text: 'Please include what you did, what you expected, and what happened instead. There is no bug bounty — Clyro is an unfunded open-source project — but reports are taken seriously and credited unless you would rather not be.'
        }
      ]
    }
  ]
};
