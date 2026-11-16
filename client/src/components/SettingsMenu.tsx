import { FolderInput, Settings } from 'lucide-react';

import HoverMenu from '@/components/ui/HoverMenu';

interface Props {
  onImportExport: () => void;
}

/** Navbar settings button whose dropdown lists app-level actions. */
export default function SettingsMenu({ onImportExport }: Props) {
  return (
    <HoverMenu
      ariaLabel='設定'
      trigger={
        <Settings
          size={20}
          className='transition-transform duration-300 ease-out group-focus-within:rotate-45 group-hover:rotate-45'
        />
      }
      items={[
        {
          label: '匯入 / 匯出',
          icon: <FolderInput size={16} />,
          onSelect: onImportExport,
        },
      ]}
    />
  );
}
