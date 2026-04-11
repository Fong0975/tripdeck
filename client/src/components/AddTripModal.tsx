import { X } from 'lucide-react';
import { useState } from 'react';

import type { Trip } from '@/types';
import { createTrip } from '@/utils/storage';

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
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'startDate' && value) {
        const end = new Date(value);
        end.setDate(end.getDate() + 3);
        updated.endDate = end.toISOString().slice(0, 10);
      }
      return updated;
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const trip = await createTrip({
        title: form.title.trim(),
        destination: form.destination.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || undefined,
      });
      onAdded(trip);
    } catch {
      setError('建立旅程失敗，請稍後再試');
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {/* Overlay */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='animate-slide-up border-border bg-card relative w-full max-w-md rounded-2xl border p-6 shadow-2xl'>
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='text-foreground text-xl font-bold'>新增旅程</h2>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5 transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              旅程名稱 *
            </label>
            <input
              name='title'
              value={form.title}
              onChange={handleChange}
              placeholder='例：東京五日遊'
              className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
            />
          </div>

          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              目的地
            </label>
            <input
              name='destination'
              value={form.destination}
              onChange={handleChange}
              placeholder='例：日本東京'
              className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='text-foreground mb-1.5 block text-sm font-medium'>
                開始日期 *
              </label>
              <input
                type='date'
                name='startDate'
                value={form.startDate}
                onChange={handleChange}
                className='border-border bg-background text-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
              />
            </div>
            <div>
              <label className='text-foreground mb-1.5 block text-sm font-medium'>
                結束日期 *
              </label>
              <input
                type='date'
                name='endDate'
                value={form.endDate}
                onChange={handleChange}
                min={form.startDate}
                className='border-border bg-background text-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
              />
            </div>
          </div>

          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              備註
            </label>
            <textarea
              name='description'
              value={form.description}
              onChange={handleChange}
              placeholder='旅程相關備註...'
              rows={3}
              className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full resize-none rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
            />
          </div>

          {error && <p className='text-destructive text-sm'>{error}</p>}

          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='border-border text-foreground hover:bg-accent flex-1 rounded-xl border px-4 py-2 transition-colors'
            >
              取消
            </button>
            <button
              type='submit'
              className='bg-primary text-primary-foreground flex-1 rounded-xl px-4 py-2 font-medium transition-all hover:opacity-90 active:scale-95'
            >
              建立旅程
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
