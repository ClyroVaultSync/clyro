import ErrorPage from '../components/ErrorPage';

export default function NotFound() {
  return <ErrorPage code="404" message="This page doesn't exist or has moved." />;
}
