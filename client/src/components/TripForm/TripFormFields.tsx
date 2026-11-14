import { INPUT_CLS, LABEL_CLS, TEXTAREA_CLS } from '@/components/formStyles';

import type { TripFormValues } from './validateTripForm';

interface Props {
  values: TripFormValues;
  /** Receives every field's change event; each input carries its field `name`. */
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

/** The title / destination / date range / notes fields of the add & edit trip forms. */
export default function TripFormFields({ values, onChange }: Props) {
  return (
    <>
      <div>
        <label className={LABEL_CLS}>旅程名稱 *</label>
        <input
          name='title'
          value={values.title}
          onChange={onChange}
          placeholder='例：東京五日遊'
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>目的地</label>
        <input
          name='destination'
          value={values.destination}
          onChange={onChange}
          placeholder='例：日本東京'
          className={INPUT_CLS}
        />
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label className={LABEL_CLS}>開始日期 *</label>
          <input
            type='date'
            name='startDate'
            value={values.startDate}
            onChange={onChange}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>結束日期 *</label>
          <input
            type='date'
            name='endDate'
            value={values.endDate}
            onChange={onChange}
            min={values.startDate}
            className={INPUT_CLS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>備註</label>
        <textarea
          name='description'
          value={values.description}
          onChange={onChange}
          placeholder='旅程相關備註...'
          rows={3}
          className={TEXTAREA_CLS}
        />
      </div>
    </>
  );
}
