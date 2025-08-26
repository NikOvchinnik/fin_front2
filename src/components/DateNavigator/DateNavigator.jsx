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
  days,
  selectedDate,
  startDate = null,
  endDate = null,
  setSelectedDate,
  onLoading,
}) => {
  const handleDateChange = date => {
    onLoading(true);
    setSelectedDate(dayjs(date));
  };

  return (
    <div className={style.dateContainer}>
      <button
        className={style.dateBtn}
        onClick={() => {
          onLoading(true);
          setSelectedDate(prev => prev.subtract(days, 'day'));
        }}
      >
        <Icon id="arrow-left-switch" className={style.dateIcon} />
      </button>

      <DatePicker
        selected={startDate ? null : selectedDate.toDate()}
        onChange={handleDateChange}
        startDate={startDate ? startDate.toDate() : null}
        endDate={endDate ? endDate.toDate() : null}
        selectsRange={Boolean(startDate)}
        dateFormat={startDate ? 'dd.MM.yy' : 'dd.MM.yyyy'}
        locale="uk"
        className={
          startDate
            ? style.dateInput
            : `${style.dateInput} ${style.dateInputDay} `
        }
      />

      <button
        className={style.dateBtn}
        onClick={() => {
          onLoading(true);
          setSelectedDate(prev => prev.add(days, 'day'));
        }}
      >
        <Icon id="arrow-right-switch" className={style.dateIcon} />
      </button>
    </div>
  );
};

export default DateNavigator;
