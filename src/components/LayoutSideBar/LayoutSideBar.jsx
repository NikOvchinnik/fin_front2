import { Outlet } from 'react-router-dom';
import SideBar from '../SideBar/SideBar';
import style from './LayoutSideBar.module.css';
import ScrollToTop from 'react-scroll-to-top';
import ScrollTop from '../ScrollToTop/ScrollToTop';
import { useMediaQuery } from '@mui/material';

const LayoutSideBar = () => {
  const isMobile = useMediaQuery('(max-width:1023px)');

  return (
    <div className={style.mainContainer}>
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
