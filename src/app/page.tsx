import { ProspectForm } from '@/components/ProspectForm';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">pvprospect</h1>
        <p className="text-sm text-zinc-600">
          Quick solar electricity estimate from an address, coordinates, or map point.
        </p>
      </header>
      <ProspectForm />
    </main>
  );
}
