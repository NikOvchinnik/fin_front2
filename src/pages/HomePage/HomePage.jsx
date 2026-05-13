import DocTitle from '../../components/DocTitle/DocTitle';
import LoginForm from '../../components/LoginForm/LoginForm';
import style from './HomePage.module.css';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();

  return (
    <section className={style.mainContainer}>
      <DocTitle>Financial Booking</DocTitle>
      <div className={style.welcomeContainer}>
        <div className={style.textContainer}>
          <h1 className={style.welcomeTitle}>Financial Booking</h1>
          <p className={style.welcomeText}>{t('home.description')}</p>
        </div>
      </div>
      <LoginForm />
    </section>
  );
};

export default HomePage;
