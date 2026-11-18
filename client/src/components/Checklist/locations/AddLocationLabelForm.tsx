import { Plus } from 'lucide-react';
import { useState } from 'react';

import { INPUT_CLS } from '@/components/ui/formStyles';
import { useSubmitting } from '@/hooks/useSubmitting';

import { validateLocationLabelName } from './locationLabelName';

interface Props {
  existingNames: readonly string[];
  /** Resolves to whether the label was added. */
  onAdd: (name: string, showAsGroup: boolean) => Promise<boolean>;
}

/** Inline form that adds a location label with its "own group" setting. */
export default function AddLocationLabelForm({ existingNames, onAdd }: Props) {
  const [name, setName] = useState('');
  const [showAsGroup, setShowAsGroup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { submitting, run } = useSubmitting();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateLocationLabelName(name, existingNames);
    setError(problem);
    if (problem) {
      return;
    }
    void run(async () => {
      if (await onAdd(name.trim(), showAsGroup)) {
        setName('');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-2'>
      <div className='flex gap-2'>
        <input
          type='text'
          aria-label='新增存放位置'
          placeholder='新增存放位置，例如：手提'
          value={name}
          onChange={e => setName(e.target.value)}
          className={`${INPUT_CLS} min-w-0 flex-1`}
        />
        <button
          type='submit'
          disabled={submitting}
          className='inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <Plus size={14} />
          新增
        </button>
      </div>
      <label className='flex items-center gap-2 text-sm text-muted-foreground'>
        <input
          type='checkbox'
          checked={showAsGroup}
          onChange={e => setShowAsGroup(e.target.checked)}
        />
        在「依存放位置」檢視中獨立成一組
      </label>
      {error && <p className='text-sm text-destructive'>{error}</p>}
    </form>
  );
}
