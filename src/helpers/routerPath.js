import { lazy } from 'react';

const routesConfig = [
  {
    path: 'users',
    roles: [1, 2, 3, 4, 5], 
    element: lazy(() => import('../pages/UsersPage/UsersPage')),
  },
];

export default routesConfig;
