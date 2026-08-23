import { ExternalLink } from 'lucide-react';

import type { ReferenceWebsite } from '@/types';

interface AttractionReferenceLinksProps {
  referenceWebsites: ReferenceWebsite[];
  /** Whether to render a leading divider, decided by the caller based on what precedes this section. */
  showTopDivider: boolean;
}

export default function AttractionReferenceLinks({
  referenceWebsites,
  showTopDivider,
}: AttractionReferenceLinksProps) {
  return (
    <>
      {showTopDivider && <hr className='border-border mt-3' />}
      <div className='mt-2 flex flex-wrap gap-1'>
        {referenceWebsites.map((site, i) => (
          <a
            key={i}
            href={site.url}
            target='_blank'
            rel='noopener noreferrer'
            onClick={e => e.stopPropagation()}
            className='text-primary flex items-center gap-0.5 text-sm hover:underline'
          >
            <ExternalLink size={10} />
            <span>{site.title || site.url}</span>
          </a>
        ))}
      </div>
    </>
  );
}
