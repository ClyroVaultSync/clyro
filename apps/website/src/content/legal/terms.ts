import type { LegalDocument } from './types';

/** Reflects the MIT licence at the repository root. If the licence changes, the
 * "Licence" section below must change with it. */
export const termsDocument: LegalDocument = {
  title: 'Terms of Use',
  subtitle:
    'Clyro is free, open-source software you run yourself. There is no service to sign up for, and no service to be cut off from.',
  lastUpdated: '2026-08-18',
  sections: [
    {
      id: 'what-you-agree-to',
      title: 'What these terms cover',
      blocks: [
        {
          kind: 'p',
          text: 'These terms apply to this website, the Clyro browser extension, and the Local Sync Server. They do not create an account, a subscription, or an ongoing service relationship, because Clyro provides none of those.'
        },
        {
          kind: 'p',
          text: 'If you do not accept these terms, do not install or use the software. Uninstalling the extension ends the relationship completely — there is nothing left behind on our side to close.'
        }
      ]
    },
    {
      id: 'licence',
      title: 'Licence',
      blocks: [
        {
          kind: 'p',
          text: 'Clyro is released under the MIT Licence. You may use, copy, modify, merge, publish, distribute, sublicense and sell copies of it, subject to including the copyright notice and permission notice. The full text is in the LICENSE file in the repository, and it governs the software itself wherever these terms and the licence differ.'
        }
      ]
    },
    {
      id: 'your-responsibility',
      title: 'Your vault is your responsibility',
      blocks: [
        {
          kind: 'note',
          variant: 'warning',
          title: 'Nobody can recover your data for you',
          text: 'Clyro holds no copy of your vault, no copy of your master password, and no key that could decrypt either. If you forget your master password, or lose the only copy of your vault file, the contents are gone permanently. This is not a limitation we can lift on request.'
        },
        {
          kind: 'p',
          text: 'You are responsible for the things that follow from that:'
        },
        {
          kind: 'list',
          items: [
            'Choosing a master password you will not forget and will not reuse elsewhere.',
            'Keeping backups — an encrypted export from the extension, and a copy of the vault file if you run the Local Sync Server.',
            'Securing the machine you run Clyro on. Encryption at rest does not protect an unlocked vault on a compromised device.',
            'Maintaining your own Google Drive or Dropbox account, if you choose cloud storage, including its access and recovery.'
          ]
        }
      ]
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      blocks: [
        {
          kind: 'p',
          text: 'Use Clyro to store credentials you are entitled to hold. Do not use it to store or manage access to accounts you have obtained without authorisation, and do not use it in ways that break the law where you are.'
        },
        {
          kind: 'p',
          text: 'Because the software runs entirely on your own machine and storage, there is no mechanism by which this could be enforced technically. It is stated as the intended use, not as a claim of control.'
        }
      ]
    },
    {
      id: 'no-warranty',
      title: 'No warranty',
      blocks: [
        {
          kind: 'p',
          text: 'Clyro is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non-infringement, as set out in the MIT Licence.'
        },
        {
          kind: 'p',
          text: 'To the maximum extent permitted by applicable law, the authors and copyright holders are not liable for any claim, damages or other liability arising from the use of the software — including loss of vault data. Some jurisdictions do not allow the exclusion of certain warranties or liabilities, in which case those exclusions apply only as far as the law permits.'
        }
      ]
    },
    {
      id: 'third-parties',
      title: 'Third-party services',
      blocks: [
        {
          kind: 'p',
          text: 'If you choose Google Drive or Dropbox as your storage, your use of those services is governed by their terms, not these. Clyro is not a party to that relationship, is not responsible for their availability, and cannot restore data lost on their side.'
        },
        {
          kind: 'p',
          text: 'The browser extension is distributed through the Chrome Web Store, whose own terms apply to the distribution.'
        }
      ]
    },
    {
      id: 'changes',
      title: 'Changes',
      blocks: [
        {
          kind: 'p',
          text: 'These terms may change as the software does. The date at the top of the page records the last revision, and every change is visible in the public commit history. Continuing to use Clyro after a change means accepting the revised terms.'
        }
      ]
    }
  ]
};
