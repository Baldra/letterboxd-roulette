import { useCallback, useState } from 'react';
import type { ApiError, SpinResponse } from '@lr/shared';
import { Brand } from './components/Brand';
import { ErrorPanel } from './components/ErrorPanel';
import { ResultCard } from './components/ResultCard';
import { SpinForm } from './components/SpinForm';
import { messageForStatus } from './errorMessages';

type SpinState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; result: SpinResponse }
  | { kind: 'error'; status: number; message: string };

function initialQuery(): string {
  return new URLSearchParams(window.location.search).get('q') ?? '';
}

function updateQueryParam(q: string) {
  const url = new URL(window.location.href);
  if (q) {
    url.searchParams.set('q', q);
  } else {
    url.searchParams.delete('q');
  }
  window.history.replaceState(null, '', url.toString());
}

export function App() {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<SpinState>({ kind: 'idle' });

  const spin = useCallback(async (q: string) => {
    setState({ kind: 'pending' });
    updateQueryParam(q);
    try {
      const res = await fetch(`/api/spin?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const result = (await res.json()) as SpinResponse;
        setState({ kind: 'success', result });
      } else {
        const body = (await res.json().catch(() => undefined)) as ApiError | undefined;
        setState({
          kind: 'error',
          status: res.status,
          message: messageForStatus(res.status, body?.error),
        });
      }
    } catch {
      setState({ kind: 'error', status: 0, message: messageForStatus(0) });
    }
  }, []);

  return (
    <main className="shell">
      <header className="shell__header">
        <Brand spinning={state.kind === 'pending'} />
        <p className="shell__tagline">Pick tonight's film, at random, from any Letterboxd watchlist.</p>
      </header>

      <SpinForm
        query={query}
        pending={state.kind === 'pending'}
        onQueryChange={setQuery}
        onSubmit={spin}
      />

      {state.kind === 'success' ? (
        <ResultCard result={state.result} onSpinAgain={() => spin(query)} />
      ) : null}

      {state.kind === 'error' ? (
        <ErrorPanel status={state.status} message={state.message} />
      ) : null}

      <footer className="shell__footer">
        One random film from a public watchlist or list. Not affiliated with Letterboxd.
      </footer>
    </main>
  );
}