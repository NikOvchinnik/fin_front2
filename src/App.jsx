import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy } from 'react';
import { useSelector } from 'react-redux';
import routesConfig from './helpers/routerPath';
import {
  selectIsAuthenticated,
  selectUserId,
  selectUserRole,
} from './redux/auth/selectors';
import LayoutSideBar from './components/LayoutSideBar/LayoutSideBar';

const HomePage = lazy(() => import('./pages/HomePage/HomePage'));

const App = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userRole = useSelector(selectUserRole);
  const userId = useSelector(selectUserId);

  const filteredRoutes = routesConfig.filter(route => {
    return route.roles.includes(userRole);
  });

  const renderRootComponent = role => {
    switch (role) {
      case 1:
        return <Navigate to={`requests`} />;  //CEO/COO
      case 2:
        return <Navigate to={`requests/${userId}`} />; //Керівник відділу
      case 3:
        return <Navigate to={`requests/${userId}`} />; //Заявник(Тімлід)
      case 4:
        return <Navigate to={`requests`} />; //Фінансист
      case 5:
        return <Navigate to={`requests`} />; //Бухгалтер
      default:
        return <HomePage />;
    }
  };

  return (
    <Routes>
      {isAuthenticated && (
        <Route element={<LayoutSideBar />}>
          {filteredRoutes.map(({ path, element: Element }) => {
            return <Route key={path} path={path} element={<Element />} />;
          })}
        </Route>
      )}
      <Route path="/" element={renderRootComponent(userRole)} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
