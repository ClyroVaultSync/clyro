import type { Metadata } from 'next';
import LegalPage from '../../../components/LegalPage';
import { securityDocument } from '../../../content/legal/security';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'Argon2id key derivation, XChaCha20-Poly1305 encryption, and the trust boundary that keeps plaintext credentials inside the extension — plus what Clyro deliberately cannot protect against.'
};

export default function SecurityPage() {
  return <LegalPage doc={securityDocument} />;
}
