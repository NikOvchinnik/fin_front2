import DocTitle from '../../components/DocTitle/DocTitle';
import LoginForm from '../../components/LoginForm/LoginForm';
import style from './HomePage.module.css';

const HomePage = () => {
  return (
    <section className={style.mainContainer}>
      <DocTitle>Financial Booking</DocTitle>
      <div className={style.welcomeContainer}>
        <div className={style.textContainer}>
          <h1 className={style.welcomeTitle}>Financial Booking</h1>
          <p className={style.welcomeText}>
            Платформа від онлайн-академії GoITeens, що допомагає ефективно
            управляти фінансами, обробляти заявки на оплату та планувати бюджет.
          </p>
        </div>
      </div>
      <LoginForm />
    </section>
  );
};

export default HomePage;
