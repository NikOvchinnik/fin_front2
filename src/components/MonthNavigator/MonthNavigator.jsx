import dayjs from 'dayjs';
import Icon from '../Icon/Icon';
import style from './MonthNavigator.module.css';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import uk from 'date-fns/locale/uk';

registerLocale('uk', {
  ...uk,
  options: { weekStartsOn: 1 },
});

const MonthNavigator = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onLoading,
}) => {
  const handleMonthChange = (date, isStart) => {
    onLoading(true);
    if (date) {
      const monthStart = dayjs(date).startOf('month');
      const monthEnd = dayjs(date).endOf('month');
      if (isStart) setStartDate(monthStart);
      else setEndDate(monthEnd);
    }
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

      <div className={style.monthPickers}>
        <DatePicker
          selected={startDate ? startDate.toDate() : null}
          onChange={date => handleMonthChange(date, true)}
          dateFormat="MM.yyyy"
          showMonthYearPicker
          locale="uk"
          className={style.dateInput}
        />
        <span className={style.separator}>-</span>
        <DatePicker
          selected={endDate ? endDate.toDate() : null}
          onChange={date => handleMonthChange(date, false)}
          dateFormat="MM.yyyy"
          showMonthYearPicker
          locale="uk"
          className={style.dateInput}
        />
      </div>

      <button className={style.dateBtn} onClick={() => shiftMonth(1)}>
        <Icon id="arrow-right-switch" className={style.dateIcon} />
      </button>
    </div>
  );
};

export default MonthNavigator;
