import { Briefcase, MapPin, X } from 'lucide-react';
import { useId, useState } from 'react';

import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import ModalOverlay from '@/components/ui/ModalOverlay';
import RetryableError from '@/components/ui/RetryableError';
import type { ChecklistCategory } from '@/types';

import LocationLabelsModal from '../../locations/LocationLabelsModal';
import CategorySidebar from '../../shared/CategorySidebar';

import CategoryDetail from './CategoryDetail';
import CategoryEditPanel from './CategoryEditPanel';
import { useGuardedAction } from './useGuardedAction';
import { useTemplateData } from './useTemplateData';

interface Props {
  onClose: () => void;
}

/**
 * Modal for viewing and editing the checklist template that is copied into
 * every new trip. Categories are listed beside (or above, on narrow screens)
 * the selected category's items; a category is viewed read-only and switched
 * to an inline editor on demand. Leaving the editor, switching category or
 * closing the modal with unsaved edits asks for confirmation first.
 */
export default function TemplateModal({ onClose }: Props) {
  const titleId = useId();
  const {
    template,
    loadError,
    reload,
    addCategory,
    deleteCategory,
    reorderCategories,
  } = useTemplateData();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [deleting, setDeleting] = useState<ChecklistCategory | null>(null);
  const [managingLocations, setManagingLocations] = useState(false);
  const { guard, showConfirm, confirm, cancel } = useGuardedAction(dirty);

  const categories = template?.categories ?? [];
  const selected = categories.find(c => c.id === selectedId) ?? categories[0];

  const handleSelect = (catId: number) => {
    if (catId === selected?.id) {
      return;
    }
    guard(() => {
      setSelectedId(catId);
      setEditing(false);
    });
  };

  const createCategory = async () => {
    const created = await addCategory();
    if (created) {
      setSelectedId(created.id);
      setEditing(true);
    }
  };

  const handleAdd = () => guard(() => void createCategory());

  const handleConfirmDelete = async () => {
    const target = deleting;
    setDeleting(null);
    if (target) {
      await deleteCategory(target.id);
    }
  };

  const renderBody = () => {
    if (!template) {
      return loadError ? (
        <RetryableError
          message='載入行李清單模板失敗，請稍後再試'
          onRetry={() => void reload()}
          className='flex-1 p-6'
        />
      ) : (
        <div className='p-6'>
          <LoadingIndicator />
        </div>
      );
    }

    return (
      <div className='flex min-h-0 flex-1 flex-col md:flex-row'>
        <CategorySidebar
          categories={categories.map(c => ({
            id: c.id,
            name: c.name,
            count: c.items.length,
          }))}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          onAdd={handleAdd}
          onReorder={reorderCategories}
        />
        <section className='flex min-h-0 min-w-0 flex-1 flex-col'>
          {!selected && (
            <p className='py-16 text-center text-sm text-muted-foreground'>
              尚無分類，請先新增一個分類。
            </p>
          )}
          {selected && editing && (
            <CategoryEditPanel
              key={selected.id}
              category={selected}
              otherCategories={categories
                .filter(c => c.id !== selected.id)
                .map(c => ({ id: c.id, name: c.name }))}
              onSaved={() => void reload()}
              onDone={() => setEditing(false)}
              onCancel={() => guard(() => setEditing(false))}
              onDirtyChange={setDirty}
            />
          )}
          {selected && !editing && (
            <CategoryDetail
              category={selected}
              onEdit={() => setEditing(true)}
              onDelete={() => setDeleting(selected)}
            />
          )}
        </section>
      </div>
    );
  };

  return (
    <>
      <ModalOverlay
        onClose={() => guard(onClose)}
        backdropClassName='backdrop-blur-xs'
        isolateWheel
      >
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby={titleId}
          className='relative flex h-[85vh] w-full max-w-5xl animate-slide-up flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl'
        >
          <div className='flex items-center gap-3 border-b border-border px-5 py-4'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Briefcase size={18} />
            </span>
            <div className='min-w-0 flex-1'>
              <h2 id={titleId} className='text-xl font-bold text-foreground'>
                行李清單模板
              </h2>
              <p className='truncate text-sm text-muted-foreground'>
                管理每次旅程行李清單的分類與項目，新增旅程時會自動複製一份
              </p>
            </div>
            <button
              type='button'
              onClick={() => setManagingLocations(true)}
              className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent'
            >
              <MapPin size={14} />
              管理位置
            </button>
            <button
              type='button'
              aria-label='關閉'
              onClick={() => guard(onClose)}
              className='shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            >
              <X size={20} />
            </button>
          </div>

          {renderBody()}
        </div>

        {showConfirm && (
          <ConfirmDialog
            title='捨棄未儲存的變更？'
            message='尚未儲存的變更將會遺失。'
            cancelLabel='繼續編輯'
            confirmLabel='捨棄'
            onCancel={cancel}
            onConfirm={confirm}
          />
        )}
        {deleting && (
          <ConfirmDialog
            title='確定要刪除分類嗎？'
            message={`「${deleting.name}」及其 ${deleting.items.length} 個項目將一併刪除，且無法復原。`}
            confirmLabel='刪除'
            onCancel={() => setDeleting(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        )}
      </ModalOverlay>
      {managingLocations && (
        <LocationLabelsModal onClose={() => setManagingLocations(false)} />
      )}
    </>
  );
}
