'use client';
import { useState } from 'react';
import { Check, Copy, Plus, TriangleAlert, X } from 'lucide-react';
import { useToast } from '@/components/toast';

export default function CreateKeyCard({
  onCreate,
}: {
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const key = await onCreate(name);
    setCreating(false);
    if (key) {
      setNewKey(key);
      setName('');
    }
  }

  return (
    <section className="card p-5">
      <h2 className="t-heading">Create a key</h2>
      <p className="t-caption mt-1">
        Name it after where it will be used, so you know what breaks if you revoke it.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Portfolio site (production)"
          aria-label="Name for the new key"
          className="input flex-1"
        />
        <button disabled={!name.trim() || creating} className="btn btn-primary">
          <Plus /> {creating ? 'Creating…' : 'Create key'}
        </button>
      </form>
      {newKey && <NewKeyNotice secret={newKey} onDismiss={() => setNewKey(null)} />}
    </section>
  );
}

// The full key exists only here and now; make copying it the obvious next step.
function NewKeyNotice({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({
        title: 'Could not copy',
        message: 'Select the key and copy it manually.',
        tone: 'warning',
      });
    }
  }

  return (
    <div className="mt-4 rounded-lg ring-1 ring-warning/40 bg-warning-soft p-4 animate-slideUp">
      <div className="flex items-start gap-3">
        <TriangleAlert className="w-[18px] h-[18px] text-warning-content shrink-0 mt-px" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-warning-content">
            Copy this key now. It won&apos;t be shown again.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 min-w-0 bg-surface text-content ring-1 ring-line rounded-md px-3 py-2 text-xs font-mono break-all">
              {secret}
            </code>
            <button onClick={copy} className="btn btn-secondary btn-sm">
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="btn btn-ghost btn-icon btn-sm -mt-1 -mr-1"
          aria-label="Dismiss"
        >
          <X />
        </button>
      </div>
    </div>
  );
}
