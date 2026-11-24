import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 text-center shadow-subtle">
        <h2 className="text-xl font-bold text-slate-900">Page Not Found</h2>
        <p className="mt-2 text-sm text-slate-600">The requested resource could not be found.</p>
        <Link
          href="/"
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}
