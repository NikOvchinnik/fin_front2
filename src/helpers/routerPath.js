import { lazy } from 'react';
import { UserRole } from './enums';

const routesConfig = [
  {
    path: 'users',
    roles: [UserRole.CEO, UserRole.HEAD_OF_DEPARTMENT, UserRole.FINANCE],
    element: lazy(() => import('../pages/UsersPage/UsersPage')),
  },
  {
    path: 'requests',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() => import('../pages/RequestsPage/RequestsPage')),
  },
  {
    path: 'my-requests',
    roles: [
      UserRole.CEO,
      UserRole.HEAD_OF_DEPARTMENT,
      UserRole.APPLICANT,
      UserRole.FINANCE,
      UserRole.ACCOUNTANT,
    ],
    element: lazy(() => import('../pages/MyRequestsPage/MyRequestsPage')),
  },
  {
    path: 'my-refunds',
    roles: [
      UserRole.CEO,
      UserRole.HEAD_OF_DEPARTMENT,
      UserRole.APPLICANT,
      UserRole.FINANCE,
      UserRole.ACCOUNTANT,
    ],
    element: lazy(() => import('../pages/MyRefundsPage/MyRefundsPage')),
  },
  {
    path: 'budgeting',
    roles: [UserRole.CEO, UserRole.HEAD_OF_DEPARTMENT, UserRole.FINANCE],
    element: lazy(() => import('../pages/BudgetingsPage/BudgetingsPage')),
  },
  {
    path: 'my-budgeting',
    roles: [
      UserRole.CEO,
      UserRole.HEAD_OF_DEPARTMENT,
      UserRole.APPLICANT,
      UserRole.FINANCE,
      UserRole.ACCOUNTANT,
    ],
    element: lazy(() => import('../pages/MyBudgetingPage/MyBudgetingPage')),
  },
  {
    path: 'exchange-rate',
    roles: [UserRole.FINANCE],
    element: lazy(() => import('../pages/ExchangeRatePage/ExchangeRatePage')),
  },
  {
    path: 'history-requests',
    roles: [
      UserRole.CEO,
      UserRole.HEAD_OF_DEPARTMENT,
      UserRole.FINANCE,
      UserRole.ACCOUNTANT,
    ],
    element: lazy(() =>
      import('../pages/HistoryPage/RequestHistoryPage/RequestHistoryPage')
    ),
  },
  {
    path: 'history-budgeting',
    roles: [
      UserRole.CEO,
      UserRole.HEAD_OF_DEPARTMENT,
      UserRole.FINANCE,
      UserRole.ACCOUNTANT,
    ],
    element: lazy(() =>
      import('../pages/HistoryPage/BudgetingHistoryPage/BudgetingHistoryPage')
    ),
  },
  {
    path: 'search',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() => import('../pages/SearchPage/SearchPage')),
  },
  {
    path: 'analytics-payment-forms',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import(
        '../pages/Analytics/PaymentFormsAnalyticPage/PaymentFormsAnalyticPage'
      )
    ),
  },

  {
    path: 'analytics-expense-categories',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import(
        '../pages/Analytics/ExpenseCategoriesAnalyticPage/ExpenseCategoriesAnalyticPage'
      )
    ),
  },
  {
    path: 'analytics-departments',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import('../pages/Analytics/DepartmetsAnalyticPage/DepartmetsAnalyticPage')
    ),
  },
  {
    path: 'analytics-currencies',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import('../pages/Analytics/CurrenciesAnalyticPage/CurrenciesAnalyticPage')
    ),
  },
  {
    path: 'analytics-contractors',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import(
        '../pages/Analytics/ContractorsAnalyticPage/ContractorsAnalyticPage'
      )
    ),
  },
  {
    path: 'analytics-total',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import('../pages/Analytics/RequestsAnalyticPage/RequestsAnalyticPage')
    ),
  },
  {
    path: 'analytics-users',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import('../pages/Analytics/UsersAnalyticPage/UsersAnalyticPage')
    ),
  },
  {
    path: 'analytics-google-sheets',
    roles: [UserRole.CEO, UserRole.FINANCE, UserRole.ACCOUNTANT],
    element: lazy(() =>
      import('../pages/Analytics/GoogleSheetsPage/GoogleSheetsPage')
    ),
  },
];

export default routesConfig;
