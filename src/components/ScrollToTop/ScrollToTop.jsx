import style from './ScrollToTop.module.css';
import Icon from '../Icon/Icon';

const ScrollTop = () => {
  return (
    <div className={style.scrollContainer}>
      <Icon id="arrow-left" className={style.scrollIcon} />
    </div>
  );
};

export default ScrollTop;
