import DocTitle from '../../components/DocTitle/DocTitle';
import style from './PayrollStatementPage.module.css';

const PayrollStatementPage = () => {
  return (
    <section className={style.mainContainer}>
      <DocTitle>Зарплатна відомість</DocTitle>
      <div className={style.headerText}>
        <h1 className={style.title}>Зарплатна відомість</h1>
      </div>

      <div className={style.emptyState}>
        <span className={style.badge}>Ця сторінка ще в розробці</span>
      </div>
    </section>
  );
};

export default PayrollStatementPage;
