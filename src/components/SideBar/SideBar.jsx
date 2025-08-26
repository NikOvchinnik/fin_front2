import { useState } from 'react';
import Icon from '../Icon/Icon';
import style from './SideBar.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { getNavSideBar } from '../../helpers/navSideBar';
import {
  selectUserId,
  selectUserName,
  selectUserRole,
} from '../../redux/auth/selectors';
import { useDispatch, useSelector } from 'react-redux';
import { Notify } from 'notiflix';
import { logout } from '../../redux/auth/slice';

const SideBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [language, setLanguage] = useState('EN');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const storedValue = localStorage.getItem('sidebarCollapsed');
    return storedValue === 'true';
  });
  const [openChildrenMenus, setOpenChildrenMenus] = useState({});

  const userRole = useSelector(selectUserRole);
  const userName = useSelector(selectUserName);
  const userId = useSelector(selectUserId);

  const dispatch = useDispatch();
  const location = useLocation();

  const openMenu = () => {
    setIsMenuOpen(true);
    document.body.classList.add(style.modalOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.classList.remove(style.modalOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prevState => {
      const newState = !prevState;
      localStorage.setItem('sidebarCollapsed', newState);
      return newState;
    });
  };

  const handleLanguageChange = lang => {
    setLanguage(lang);
    Notify.info('Терпіння, фіча ще не працює');
  };

  const filteredPages = getNavSideBar(userId, userName)
    .filter(item => item.roles.includes(userRole))
    .flatMap(item => item.pages);

  const toggleSubmenu = index => {
    setOpenChildrenMenus(prev => ({
      [index]: !prev[index],
    }));
  };

  return (
    <>
      <div className={style.burgerContainer}>
        {isMenuOpen ? (
          <button
            onClick={closeMenu}
            className={`${style.btnMenu} ${style.btnMenuClose}`}
          >
            <Icon id="close" className={style.iconMenuClose} />
            Меню
          </button>
        ) : (
          <button onClick={openMenu} className={style.btnMenu}>
            <Icon id="menu" className={style.iconMenu} />
            Меню
          </button>
        )}
      </div>
      <div
        className={`${
          isMenuOpen ? style.navContainerMobile : style.navContainerDesktop
        } ${isCollapsed ? style.navContainerCollapsed : ''}`}
      >
        <div className={style.logoContainer}>
          <NavLink to="/">
            <img
              src="/logo.svg"
              alt="logo"
              className={`${style.logo} ${
                isCollapsed ? style.logoCollapsed : ''
              }`}
            />
          </NavLink>
          <button
            className={style.btnSideBarMenu}
            onClick={toggleSidebarCollapse}
          >
            <Icon
              id="sideBar-menu"
              className={`${style.iconSideBarMenu} ${
                isCollapsed ? style.iconSideBarMenuCollapsed : ''
              } `}
            />
          </button>
        </div>
        <ul className={style.navList}>
          {filteredPages.map(({ page, link, icon, children }, index) => {
            const isChildActive = children?.some(
              child => location.pathname === child.link
            );

            return (
              <li key={index} className={style.navItem}>
                {children ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(index)}
                      className={`${style.navLink} ${
                        isChildActive ? style.navLinkActive : ''
                      }`}
                    >
                      <Icon id={icon} className={style.iconNav} />
                      <p
                        className={`${
                          isCollapsed ? style.navTextCollapsed : ''
                        }`}
                      >
                        {page}
                      </p>
                    </button>
                    {openChildrenMenus[index] && (
                      <div className={style.childrenContainer}>
                        <button
                          className={`${style.btnSideBarMenu} ${style.btnChildrenMenu}`}
                          onClick={() => toggleSubmenu(index)}
                        >
                          <Icon
                            id="sideBar-menu"
                            className={style.iconSideBarMenu}
                          />
                        </button>
                        <ul className={style.childrenList}>
                          {children.map((child, subIndex) => (
                            <li key={subIndex} className={style.navItem}>
                              <NavLink
                                to={child.link}
                                onClick={() => {
                                  closeMenu();
                                  toggleSubmenu(index);
                                }}
                                className={({ isActive }) =>
                                  isActive
                                    ? `${style.navChildrenLink} ${style.navChildrenLinkActive}`
                                    : style.navChildrenLink
                                }
                              >
                                {child.page}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : link.startsWith('http') ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={style.navLink}
                    onClick={() => {
                      closeMenu();
                      setOpenChildrenMenus({});
                    }}
                  >
                    <Icon id={icon} className={style.iconNav} />
                    <p className={isCollapsed ? style.navTextCollapsed : ''}>
                      {page}
                    </p>
                  </a>
                ) : (
                  <NavLink
                    to={link}
                    onClick={() => {
                      closeMenu();
                      setOpenChildrenMenus({});
                    }}
                    className={({ isActive }) =>
                      isActive
                        ? `${style.navLink} ${style.navLinkActive}`
                        : style.navLink
                    }
                  >
                    <Icon id={icon} className={style.iconNav} />
                    <p className={isCollapsed ? style.navTextCollapsed : ''}>
                      {page}
                    </p>
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
        <div
          className={`${style.navUserContainer} ${
            isCollapsed ? style.navUserContainerCollapsed : ''
          }`}
        >
          <div className={style.languageSwitcher}>
            <button
              className={`${style.languageBtn} ${
                language === 'EN' ? `${style.languageBtnActive}` : ''
              }`}
              onClick={() => handleLanguageChange('EN')}
            >
              ENG
            </button>
            <button
              className={`${style.languageBtn} ${
                language === 'UA' ? `${style.languageBtnActive}` : ''
              }`}
              onClick={() => handleLanguageChange('UA')}
            >
              UA
            </button>
          </div>
          <button
            className={style.btnLogOut}
            onClick={() => dispatch(logout())}
          >
            {userName}
            <Icon id="log-out" className={style.iconLogOut} />
          </button>
        </div>
      </div>
    </>
  );
};

export default SideBar;
