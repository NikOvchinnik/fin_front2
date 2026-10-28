import { Outlet } from 'react-router-dom';
import SideBar from '../SideBar/SideBar';
import style from './LayoutSideBar.module.css';
import ScrollToTop from 'react-scroll-to-top';
import ScrollTop from '../ScrollToTop/ScrollToTop';
import { useMediaQuery } from '@mui/material';
import HalloweenEggs from '../../halloween/HalloweenEggs';

const LayoutSideBar = () => {
  const isMobile = useMediaQuery('(max-width:1023px)');

  return (
    <div className={style.mainContainer}>
      <HalloweenEggs
        options={{
          appRoot: '#root',
          from: [10, 27],
          to: [11, 3],
          spots: { deco: null },
          spiderEvery: 3 * 60000,
          ghostEvery: 4 * 60000,
          hints: { study: 'Зазирни в перший пункт меню зліва' },
        }}
      />
      <SideBar />
      <div className={style.contentContainer}>
        {!isMobile && (
          <ScrollToTop
            component={<ScrollTop />}
            smooth
            style={{ borderRadius: '50%' }}
          />
        )}
        <Outlet />
      </div>
    </div>
  );
};

export default LayoutSideBar;
