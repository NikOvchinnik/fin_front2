import dayjs from 'dayjs';
import { Tooltip } from '@mui/material';
import Icon from '../Icon/Icon';
import style from './PaymentChangeNote.module.css';

const LABELS = {
  payment_form: 'Форма оплати',
  payment_details: 'Реквізити',
};

const formatValue = value => {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

// Бекенд віддає UTC без позначки зони.
const toLocal = date => dayjs(/Z|[+-]\d\d:\d\d$/.test(date) ? date : `${date}Z`);

const formatMeta = note =>
  [note.date && toLocal(note.date).format('DD.MM.YYYY HH:mm'), note.user_name]
    .filter(Boolean)
    .join(', ');

// Значок біля форми оплати/реквізитів, якщо їх змінювали в місяці або після відправки.
const PaymentChangeNote = ({ field, notes, children }) => {
  if (!notes?.length) return children;

  const hasAfterSnapshot = notes.some(note => note.type === 'after_snapshot');
  const title = (
    <div className={style.tooltip}>
      {notes.map((note, index) => (
        <div key={index} className={style.item}>
          {note.type === 'after_snapshot' ? (
            <>
              <p className={style.alert}>
                {LABELS[field]} змінено після відправки на перевірку
              </p>
              <p className={style.meta}>{formatMeta(note)}</p>
              <p>У відомості: {formatValue(note.old)}</p>
              <p>Зараз: {formatValue(note.new)}</p>
            </>
          ) : (
            <>
              <p className={style.heading}>Змінено в цьому місяці</p>
              <p className={style.meta}>{formatMeta(note)}</p>
              {note.manager && <p>Керівник: {note.manager}</p>}
              <p>Було: {formatValue(note.old)}</p>
              <p>Стало: {formatValue(note.new)}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <span className={style.cell}>
      {children}
      <Tooltip title={title}>
        <span
          className={`${style.badge} ${hasAfterSnapshot ? style.badgeAlert : ''}`}
          onClick={event => event.stopPropagation()}
        >
          <Icon id="history" className={style.icon} />
        </span>
      </Tooltip>
    </span>
  );
};

export default PaymentChangeNote;
