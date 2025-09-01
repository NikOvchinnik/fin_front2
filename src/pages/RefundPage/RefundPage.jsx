import { useState, useEffect, useCallback } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './RefundPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';

const RefundPage = () => {
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      console.log(1);
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>Refund</DocTitle>
          <h1>RefundPage</h1>
        </section>
      )}
    </>
  );
};

export default RefundPage;
