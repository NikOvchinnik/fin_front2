import { lazy } from 'react';

const routesConfig = [
  {
    path: 'users',
    roles: [1, 2],
    element: lazy(() => import('../pages/UsersPage/UsersPage')),
  },
  {
    path: 'requests',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/RequestsPage/RequestsPage')),
  },
  {
    path: 'my_requests/:userId',
    roles: [1, 2, 3, 4, 5],
    element: lazy(() => import('../pages/MyRequestsPage/MyRequestsPage')),
  },
  {
    path: 'my_refunds/:userId',
    roles: [1, 2, 3, 4, 5],
    element: lazy(() => import('../pages/MyRefundsPage/MyRefundsPage')),
  },
  {
    path: 'budgeting',
    roles: [1, 2, 4],
    element: lazy(() => import('../pages/BudgetingPage/BudgetingPage')),
  },
  {
    path: 'my_budgeting/:userId',
    roles: [1, 2, 3, 4, 5],
    element: lazy(() => import('../pages/MyBudgetingPage/MyBudgetingPage')),
  },
  {
    path: 'exchange_rate',
    roles: [4],
    element: lazy(() => import('../pages/ExchangeRatePage/ExchangeRatePage')),
  },
  {
    path: 'history_requests',
    roles: [1, 2, 4, 5],
    element: lazy(() =>
      import('../pages/HistoryPage/RequestHistoryPage/RequestHistoryPage')
    ),
  },
  {
    path: 'history_budgeting',
    roles: [1, 2, 4, 5],
    element: lazy(() =>
      import('../pages/HistoryPage/BudgetingHistoryPage/BudgetingHistoryPage')
    ),
  },
  {
    path: 'search',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/SearchPage/SearchPage')),
  },
  {
    path: 'analytics-payment-forms',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/Analytics/PaymentFormsAnalyticPage/PaymentFormsAnalyticPage')),
  },

  {
    path: 'analytics-expense-categories',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/Analytics/ExpenseCategoriesAnalyticPage/ExpenseCategoriesAnalyticPage')),
  },
  {
    path: 'analytics-departments',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/Analytics/DepartmetsAnalyticPage/DepartmetsAnalyticPage')),
  },
  {
    path: 'analytics-currencies',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/Analytics/CurrenciesAnalyticPage/CurrenciesAnalyticPage')),
  },
  {
    path: 'analytics-contractors',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/Analytics/ContractorsAnalyticPage/ContractorsAnalyticPage')),
  },
  {
    path: 'analytics-total',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/Analytics/RequestsAnalyticPage/RequestsAnalyticPage')),
  },
  {
    path: 'analytics-users',
    roles: [1, 4, 5],
    element: lazy(() => import('../pages/Analytics/UsersAnalyticPage/UsersAnalyticPage')),
  },
];

export default routesConfig;
