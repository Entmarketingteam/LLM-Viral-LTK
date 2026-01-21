import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasClerk = !!key?.trim() && !key.includes("...");

function ClerkSetup() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Clerk setup required</h1>
        <p className="text-gray-600 text-sm mb-4">
          Add your keys to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">.env</code> and restart the dev server:
        </p>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside mb-4">
          <li><code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code></li>
          <li><code className="bg-gray-100 px-1 rounded">CLERK_SECRET_KEY</code></li>
        </ul>
        <a
          href="https://dashboard.clerk.com/last-active?path=api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          Get keys at dashboard.clerk.com →
        </a>
        <p className="text-xs text-gray-500 mt-4">
          Copy <code className="bg-gray-100 px-1 rounded">env.example</code> to <code className="bg-gray-100 px-1 rounded">.env</code> and replace the placeholders.
        </p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {hasClerk ? (
          <ClerkProvider>
            {children}
          </ClerkProvider>
        ) : (
          <ClerkSetup />
        )}
      </body>
    </html>
  );
}

