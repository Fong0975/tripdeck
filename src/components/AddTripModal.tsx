import { X } from 'lucide-react';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

import type { Trip } from '@/types';
import { addTrip, initTripContent } from '@/utils/storage';

interface Props {
  onClose: () => void;
  onAdded: (trip: Trip) => void;
}

export default function AddTripModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return setError('請輸入旅程名稱');
    }
    if (!form.startDate || !form.endDate) {
      return setError('請選擇旅遊期間');
    }
    if (form.endDate < form.startDate) {
      return setError('結束日期不能早於開始日期');
    }

    const trip: Trip = {
      id: uuid(),
      title: form.title.trim(),
      destination: form.destination.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      description: form.description.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addTrip(trip);
    initTripContent(trip);
    onAdded(trip);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {/* Overlay */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='relative w-full max-w-md animate-slide-up rounded-2xl border border-border bg-card p-6 shadow-2xl'>
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-foreground'>新增旅程</h2>
          <button
            onClick={onClose}
            className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='mb-1.5 block text-sm font-medium text-foreground'>
              旅程名稱 *
            </label>
            <input
              name='title'
              value={form.title}
              onChange={handleChange}
              placeholder='例：東京五日遊'
              className='w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
            />
          </div>

          <div>
            <label className='mb-1.5 block text-sm font-medium text-foreground'>
              目的地
            </label>
            <input
              name='destination'
              value={form.destination}
              onChange={handleChange}
              placeholder='例：日本東京'
              className='w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='mb-1.5 block text-sm font-medium text-foreground'>
                開始日期 *
              </label>
              <input
                type='date'
                name='startDate'
                value={form.startDate}
                onChange={handleChange}
                className='w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
              />
            </div>
            <div>
              <label className='mb-1.5 block text-sm font-medium text-foreground'>
                結束日期 *
              </label>
              <input
                type='date'
                name='endDate'
                value={form.endDate}
                onChange={handleChange}
                min={form.startDate}
                className='w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
              />
            </div>
          </div>

          <div>
            <label className='mb-1.5 block text-sm font-medium text-foreground'>
              備註
            </label>
            <textarea
              name='description'
              value={form.description}
              onChange={handleChange}
              placeholder='旅程相關備註...'
              rows={3}
              className='w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
            />
          </div>

          {error && <p className='text-sm text-destructive'>{error}</p>}

          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 rounded-xl border border-border px-4 py-2 text-foreground transition-colors hover:bg-accent'
            >
              取消
            </button>
            <button
              type='submit'
              className='flex-1 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95'
            >
              建立旅程
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
