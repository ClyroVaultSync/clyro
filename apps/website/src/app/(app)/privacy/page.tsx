import type { Metadata } from 'next';
import LegalPage from '../../../components/LegalPage';
import { privacyDocument } from '../../../content/legal/privacy';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Clyro has no accounts, no servers and no analytics. What that means in practice, and what your storage provider can and cannot see.'
};

export default function PrivacyPage() {
  return <LegalPage doc={privacyDocument} />;
}
