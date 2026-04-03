import { Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import ChecklistTemplateEditor from '@/components/ChecklistTemplateEditor';

export default function ChecklistSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className='mx-auto max-w-screen-xl px-4 pb-20'>
      <div className='border-border bg-card rounded-2xl border'>
        {/* Section header / toggle */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className='flex w-full items-center gap-3 px-6 py-4 text-left'
        >
          <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl'>
            <Briefcase size={18} />
          </div>
          <div className='flex-1'>
            <h2 className='text-foreground text-base font-bold'>
              行李清單模板
            </h2>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              管理每次旅程行李清單的分類與項目，新增旅程時會自動複製一份
            </p>
          </div>
          <span className='text-muted-foreground'>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>

        {expanded && (
          <div className='border-border border-t px-6 py-5'>
            <ChecklistTemplateEditor />
          </div>
        )}
      </div>
    </section>
  );
}
