import { EXTENSION_INSTALL_STEPS } from '../lib/extension-install';

/** The extension's zip install steps, as a numbered list. */
export default function ExtensionInstallSteps() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-body">
      {EXTENSION_INSTALL_STEPS.map(step => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}
