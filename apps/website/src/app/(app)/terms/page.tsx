import type { Metadata } from 'next';
import LegalPage from '../../../components/LegalPage';
import { termsDocument } from '../../../content/legal/terms';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'Clyro is free, MIT-licensed software you run yourself. Licence, your responsibility for your own vault, and the absence of any warranty.'
};

export default function TermsPage() {
  return <LegalPage doc={termsDocument} />;
}
