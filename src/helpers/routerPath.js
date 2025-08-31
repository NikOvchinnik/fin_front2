import { lazy } from 'react';

const routesConfig = [
  {
    path: 'users',
    roles: [1],
    element: lazy(() => import('../pages/UsersPage/UsersPage')),
  },
  {
    path: 'requests',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/RequestsPage/RequestsPage')),
  },
  {
    path: 'my_requests/:id',
    roles: [1, 2, 3, 4, 5],
    element: lazy(() => import('../pages/MyRequestsPage/MyRequestsPage')),
  },
  {
    path: 'budgeting',
    roles: [1, 2, 3, 4, 5],
    element: lazy(() => import('../pages/BudgetingPage/BudgetingPage')),
  },
  {
    path: 'exchange_rate',
    roles: [4],
    element: lazy(() => import('../pages/ExchangeRatePage/ExchangeRatePage')),
  },
  {
    path: 'history',
    roles: [1],
    element: lazy(() => import('../pages/HistoryPage/HistoryPage')),
  },
  {
    path: 'refund',
    roles: [1, 2, 3, 4, 5],
    element: lazy(() => import('../pages/RefundPage/RefundPage')),
  },
];

export default routesConfig;
