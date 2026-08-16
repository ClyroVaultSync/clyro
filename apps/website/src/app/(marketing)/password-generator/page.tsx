import localFont from 'next/font/local';
import { PasswordGenerator } from '../../../components/PasswordGenerator/PasswordGenerator';
import TextType from '../../../components/TextType';

const basementGrotesque = localFont({
  src: '../../../fonts/basement-grotesque/BasementGrotesque-Black.woff2',
  display: 'swap',
});

export default function PasswordGeneratorPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className={`${basementGrotesque.className} text-2xl text-heading`}>Password Generator</h1>
        <TextType
          text="Create strong, random passwords instantly — generated entirely in your browser, never sent anywhere."
          typingSpeed={35}
          pauseDuration={4000}
          loop={false}
          showCursor={true}
          variableSpeed={undefined}
          onSentenceComplete={undefined}
          className="max-w-md text-sm text-body"
        />
      </div>
      <PasswordGenerator />
    </main>
  );
}
