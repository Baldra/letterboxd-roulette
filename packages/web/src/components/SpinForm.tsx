import type { FormEvent } from 'react';
import { useState } from 'react';

interface SpinFormProps {
  query: string;
  pending: boolean;
  onQueryChange: (q: string) => void;
  onSubmit: (q: string) => void;
}

export function SpinForm({ query, pending, onQueryChange, onSubmit }: SpinFormProps) {
  const [draft, setDraft] = useState(query);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    onSubmit(draft);
    onQueryChange(draft);
  }

  return (
    <form className="spin-form" onSubmit={handleSubmit}>
      <label htmlFor="spin-query" className="spin-form__label">
        Whose watchlist or list should we spin?
      </label>
      <div className="spin-form__row">
        <input
          id="spin-query"
          className="spin-form__input"
          type="text"
          value={draft}
          placeholder="username"
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="spin-form__submit" disabled={pending}>
          {pending ? 'Spinning…' : 'Spin'}
        </button>
      </div>
    </form>
  );
}