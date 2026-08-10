'use client';

import ErrorPage from '../components/ErrorPage';

export default function Error({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPage code="500" message={error.digest ? `Something went wrong (ref: ${error.digest}).` : 'Something went wrong.'} />;
}
