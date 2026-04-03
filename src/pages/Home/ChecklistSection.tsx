import { Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import ChecklistTemplateEditor from '@/components/ChecklistTemplateEditor';

export default function ChecklistSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className='mx-auto max-w-screen-xl px-4 pb-20'>
      <div className='rounded-2xl border border-border bg-card'>
        {/* Section header / toggle */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className='flex w-full items-center gap-3 px-6 py-4 text-left'
        >
          <div className='flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <Briefcase size={18} />
          </div>
          <div className='flex-1'>
            <h2 className='text-base font-bold text-foreground'>
              行李清單模板
            </h2>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              管理每次旅程行李清單的分類與項目，新增旅程時會自動複製一份
            </p>
          </div>
          <span className='text-muted-foreground'>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>

        {expanded && (
          <div className='border-t border-border px-6 py-5'>
            <ChecklistTemplateEditor />
          </div>
        )}
      </div>
    </section>
  );
}
