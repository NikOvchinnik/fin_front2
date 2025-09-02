import dayjs from 'dayjs';
import Icon from '../Icon/Icon';
import style from './DateNavigator.module.css';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import uk from 'date-fns/locale/uk';

registerLocale('uk', {
  ...uk,
  options: { weekStartsOn: 1 },
});

const DateNavigator = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onLoading,
}) => {
  const handleDateChange = dates => {
    onLoading(true);
    const [start, end] = dates;
    setStartDate(start ? dayjs(start) : null);
    setEndDate(end ? dayjs(end) : null);
  };

  const shiftMonth = months => {
    onLoading(true);
    setStartDate(prev =>
      prev ? prev.add(months, 'month').startOf('month') : null
    );
    setEndDate(prev =>
      prev ? prev.add(months, 'month').endOf('month') : null
    );
  };

  return (
    <div className={style.dateContainer}>
      <button className={style.dateBtn} onClick={() => shiftMonth(-1)}>
        <Icon id="arrow-left-switch" className={style.dateIcon} />
      </button>

      <DatePicker
        selected={startDate ? startDate.toDate() : null}
        onChange={handleDateChange}
        startDate={startDate ? startDate.toDate() : null}
        endDate={endDate ? endDate.toDate() : null}
        selectsRange
        dateFormat="dd.MM.yyyy"
        locale="uk"
        className={style.dateInput}
      />

      <button className={style.dateBtn} onClick={() => shiftMonth(1)}>
        <Icon id="arrow-right-switch" className={style.dateIcon} />
      </button>
    </div>
  );
};

export default DateNavigator;
