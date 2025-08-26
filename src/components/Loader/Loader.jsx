import { ColorRing } from 'react-loader-spinner';
import style from './Loader.module.css';

const Loader = () => {
  return (
    <div className={style.loaderContainer}>
      <ColorRing
        visible={true}
        height="200"
        width="200"
        ariaLabel="color-ring-loading"
        wrapperStyle={{}}
        wrapperClass="color-ring-wrapper"
        colors={['#5a2410', '#9a4026', '#c25a35', '#d97b5c', '#e8a893']}
      />
    </div>
  );
};

export default Loader;
