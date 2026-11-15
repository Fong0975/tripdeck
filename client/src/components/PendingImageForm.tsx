import { FIELD_LIMITS } from '@tripdeck/shared';
import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { INPUT_CLS } from '@/components/ui/formStyles';
import { showToast } from '@/components/ui/toast';
import { useObjectUrls } from '@/hooks/useObjectUrls';
import { useSubmitting } from '@/hooks/useSubmitting';
import { ACCEPTED_IMAGE_TYPES, validateImageFile } from '@/utils/uploadLimits';

interface Props {
  /** Label of the confirm button. */
  confirmLabel: string;
  /** Label shown on the confirm button while `onConfirm` is in flight; defaults to `confirmLabel`. */
  busyLabel?: string;
  /**
   * Receives the picked file and its trimmed, non-empty title. The form
   * resets once this settles successfully; a rejection keeps the pending
   * file and title so the user can retry (the caller reports the error).
   */
  onConfirm: (file: File, title: string) => Promise<void> | void;
  /** Called after the user discards the pending file. */
  onCancel?: () => void;
}

/**
 * The "add image" flow shared by image editors: a trigger button that opens
 * a hidden file picker, then a pending-file card with a preview, a required
 * title input and a confirm button. The preview's object URL is owned (and
 * always revoked) by this component.
 */
export default function PendingImageForm({
  confirmLabel,
  busyLabel,
  onConfirm,
  onCancel,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useObjectUrls();
  const { submitting, run } = useSubmitting();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState('');
  const [error, setError] = useState('');

  const replacePreview = (file: File | null) => {
    if (previewUrl) {
      objectUrls.revoke(previewUrl);
    }
    setPreviewUrl(file ? objectUrls.create(file) : null);
  };

  const resetPending = () => {
    replacePreview(null);
    setPendingFile(null);
    setPendingTitle('');
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    // Clear the input so picking the same file again still fires onChange.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) {
      return;
    }
    const invalidReason = validateImageFile(file);
    if (invalidReason) {
      showToast('error', invalidReason);
      return;
    }
    replacePreview(file);
    setPendingFile(file);
    setPendingTitle('');
    setError('');
  };

  const handleCancel = () => {
    resetPending();
    onCancel?.();
  };

  const confirmPending = async (file: File, title: string) => {
    try {
      await onConfirm(file, title);
    } catch {
      return;
    }
    resetPending();
  };

  const handleConfirm = () => {
    if (!pendingFile) {
      return;
    }
    const title = pendingTitle.trim();
    if (!title) {
      setError('請輸入圖片標題');
      return;
    }
    setError('');
    void run(() => confirmPending(pendingFile, title));
  };

  return (
    <>
      {pendingFile ? (
        <div className='space-y-2 rounded-lg border border-dashed border-border p-3'>
          {previewUrl && (
            <div className='relative'>
              <img
                src={previewUrl}
                alt='預覽'
                className='h-32 w-full rounded-lg object-cover'
              />
              <button
                type='button'
                tabIndex={-1}
                onClick={handleCancel}
                className='absolute top-1 right-1 rounded-md bg-black/50 p-1 text-white hover:bg-black/70'
              >
                <X size={12} />
              </button>
            </div>
          )}
          <input
            value={pendingTitle}
            onChange={e => {
              setPendingTitle(e.target.value);
              setError('');
            }}
            placeholder='圖片標題（必填）'
            maxLength={FIELD_LIMITS.name}
            className={`${INPUT_CLS} text-sm`}
          />
          {error && <p className='text-xs text-destructive'>{error}</p>}
          <button
            type='button'
            onClick={handleConfirm}
            disabled={submitting}
            className='w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50'
          >
            {submitting && busyLabel ? busyLabel : confirmLabel}
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          className='flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary'
        >
          <ImagePlus size={16} />
          新增圖片
        </button>
      )}
      <input
        ref={fileInputRef}
        type='file'
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={handleFileChange}
        className='hidden'
      />
    </>
  );
}
