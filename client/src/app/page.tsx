import { publicEnv } from '@/lib/env';

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Phase 1</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Project management system
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          The Next.js client and Express API are separated. Authentication, projects, and Kanban
          boards will be added in later phases.
        </p>
        <dl className="mt-8 grid gap-4 text-sm text-slate-700">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <dt className="font-medium text-slate-500">API</dt>
            <dd className="mt-1 font-mono">{publicEnv.apiUrl}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <dt className="font-medium text-slate-500">Socket</dt>
            <dd className="mt-1 font-mono">{publicEnv.socketUrl}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
