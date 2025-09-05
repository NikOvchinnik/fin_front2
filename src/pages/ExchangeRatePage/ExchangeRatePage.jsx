import { useState, useEffect, useCallback } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './ExchangeRatePage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getCurrencies, updateCurrencies } from '../../helpers/axios/payments';

const ExchangeRatePage = () => {
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState([]);
  const [updatedRates, setUpdatedRates] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const data = await getCurrencies();
      setCurrencies(data);
      const initialRates = {};
      data.forEach(c => {
        initialRates[c.id] = c.rate;
      });
      setUpdatedRates(initialRates);
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRateChange = (id, value) => {
    setUpdatedRates(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSaveAll = async () => {
    try {
      const payload = {
        updated_by: 'admin', // или user_id, если есть
        currencies: currencies.map(c => ({
          name: c.name,
          rate: parseFloat(updatedRates[c.id]),
        })),
      };

      await updateCurrencies(payload);
      Notify.success('Курси успішно оновлено!');
      fetchData();
    } catch (err) {
      Notify.failure('Не вдалося зберегти курси');
    }
  };

  return (
    <section className={style.mainContainer}>
      <DocTitle>ExchangeRate</DocTitle>
      <h1 className={style.title}>Редагування курсів валют</h1>

      <div className={style.cardsContainer}>
        {currencies.map(currency => (
          <div key={currency.id} className={style.card}>
            <div className={style.currencyName}>{currency.name}</div>
            <input
              type="number"
              step="0.01"
              value={updatedRates[currency.id]}
              onChange={e => handleRateChange(currency.id, e.target.value)}
              className={style.rateInput}
            />
            <div className={style.rateDate}>Дата: {currency.rate_date}</div>
          </div>
        ))}
      </div>

      <button className={style.saveButton} onClick={handleSaveAll}>
        Зберегти всі
      </button>
    </section>
  );
};

export default ExchangeRatePage;
