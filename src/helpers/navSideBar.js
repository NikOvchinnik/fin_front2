import { UserRole } from './enums';
import { canAccessGoogleSheetsAnalytics } from './featureAccess';

export const getNavSideBar = userId => {
  const showCeoGoogleSheets = canAccessGoogleSheetsAnalytics({
    userId,
    userRole: UserRole.CEO,
  });
  const showAccountantGoogleSheets = canAccessGoogleSheetsAnalytics({
    userId,
    userRole: UserRole.ACCOUNTANT,
  });
  const showFinanceGoogleSheets = canAccessGoogleSheetsAnalytics({
    userId,
    userRole: UserRole.FINANCE,
  });

  return [
    {
      roles: [UserRole.CEO],
      pages: [
        {
          page: 'Користувачі',
          pageKey: 'nav.users',
          link: `/users`,
          icon: 'users',
        },
        {
          page: 'Всі заявки',
          pageKey: 'nav.allRequests',
          link: `/requests`,
          icon: 'files',
        },
        {
          page: 'Мої заявки',
          pageKey: 'nav.myRequests',
          link: `/my-requests`,
          icon: 'file',
        },
        {
          page: 'Повернення коштів',
          pageKey: 'nav.refunds',
          link: `/my-refunds`,
          icon: 'refund',
        },
        {
          page: 'Бюджетування',
          pageKey: 'nav.budgeting',
          link: `/budgeting`,
          icon: 'piggy-bank',
        },
        {
          page: 'Мій бюджет',
          pageKey: 'nav.myBudget',
          link: `/my-budgeting`,
          icon: 'coins',
        },
        {
          page: 'Пошук',
          pageKey: 'nav.search',
          link: `/search`,
          icon: 'search-crm',
        },
        {
          page: 'Аналітика',
          pageKey: 'nav.analytics',
          icon: 'analytics',
          children: [
            {
              page: 'Загальна аналітика',
              pageKey: 'nav.totalAnalytics',
              link: '/analytics-total',
            },
            {
              page: 'Департаменти',
              pageKey: 'nav.departments',
              link: '/analytics-departments',
            },
            {
              page: 'Користувачі',
              pageKey: 'nav.users',
              link: '/analytics-users',
            },
            {
              page: 'Контрагенти',
              pageKey: 'nav.contractors',
              link: '/analytics-contractors',
            },
            {
              page: 'Форми оплати',
              pageKey: 'nav.paymentForms',
              link: '/analytics-payment-forms',
            },
            {
              page: 'Статті витрат',
              pageKey: 'nav.expenseCategories',
              link: '/analytics-expense-categories',
            },
            {
              page: 'Валюти',
              pageKey: 'nav.currencies',
              link: '/analytics-currencies',
            },
            ...(showCeoGoogleSheets
              ? [
                  {
                    page: 'Google Sheets',
                    pageKey: 'nav.googleSheets',
                    link: '/analytics-google-sheets',
                  },
                ]
              : []),
          ],
        },
      ],
    },
    {
      roles: [UserRole.HEAD_OF_DEPARTMENT],
      pages: [
        {
          page: 'Користувачі',
          pageKey: 'nav.users',
          link: `/users`,
          icon: 'users',
        },
        {
          page: 'Мої заявки',
          pageKey: 'nav.myRequests',
          link: `/my-requests`,
          icon: 'file',
        },
        {
          page: 'Повернення коштів',
          pageKey: 'nav.refunds',
          link: `/my-refunds`,
          icon: 'refund',
        },
        {
          page: 'Бюджетування',
          pageKey: 'nav.budgeting',
          link: `/budgeting`,
          icon: 'piggy-bank',
        },
        {
          page: 'Мій бюджет',
          pageKey: 'nav.myBudget',
          link: `/my-budgeting`,
          icon: 'coins',
        },
        {
          page: 'Історія',
          pageKey: 'nav.history',
          icon: 'history',
          children: [
            {
              page: 'Заявки історія',
              pageKey: 'nav.requestHistory',
              link: '/history-requests',
            },
            {
              page: 'Бюджетування історія',
              pageKey: 'nav.budgetingHistory',
              link: '/history-budgeting',
            },
          ],
        },
      ],
    },
    {
      roles: [UserRole.APPLICANT],
      pages: [
        {
          page: 'Мої заявки',
          pageKey: 'nav.myRequests',
          link: `/my-requests`,
          icon: 'file',
        },
        {
          page: 'Повернення коштів',
          pageKey: 'nav.refunds',
          link: `/my-refunds`,
          icon: 'refund',
        },
        {
          page: 'Мій бюджет',
          pageKey: 'nav.myBudget',
          link: `/my-budgeting`,
          icon: 'coins',
        },
      ],
    },
    {
      roles: [UserRole.FINANCE],
      pages: [
        {
          page: 'Користувачі',
          pageKey: 'nav.users',
          link: `/users`,
          icon: 'users',
        },
        {
          page: 'Всі заявки',
          pageKey: 'nav.allRequests',
          link: `/requests`,
          icon: 'files',
        },
        {
          page: 'Мої заявки',
          pageKey: 'nav.myRequests',
          link: `/my-requests`,
          icon: 'file',
        },
        {
          page: 'Повернення коштів',
          pageKey: 'nav.refunds',
          link: `/my-refunds`,
          icon: 'refund',
        },
        {
          page: 'Бюджетування',
          pageKey: 'nav.budgeting',
          link: `/budgeting`,
          icon: 'piggy-bank',
        },
        {
          page: 'Мій бюджет',
          pageKey: 'nav.myBudget',
          link: `/my-budgeting`,
          icon: 'coins',
        },
        {
          page: 'Пошук',
          pageKey: 'nav.search',
          link: `/search`,
          icon: 'search-crm',
        },
        {
          page: 'Курс валют',
          pageKey: 'nav.exchangeRate',
          link: `/exchange-rate`,
          icon: 'dollar',
        },
        {
          page: 'Історія',
          pageKey: 'nav.history',
          icon: 'history',
          children: [
            {
              page: 'Заявки історія',
              pageKey: 'nav.requestHistory',
              link: '/history-requests',
            },
            {
              page: 'Бюджетування історія',
              pageKey: 'nav.budgetingHistory',
              link: '/history-budgeting',
            },
          ],
        },
        {
          page: 'Аналітика',
          pageKey: 'nav.analytics',
          icon: 'analytics',
          children: [
            {
              page: 'Загальна аналітика',
              pageKey: 'nav.totalAnalytics',
              link: '/analytics-total',
            },
            {
              page: 'Департаменти',
              pageKey: 'nav.departments',
              link: '/analytics-departments',
            },
            {
              page: 'Користувачі',
              pageKey: 'nav.users',
              link: '/analytics-users',
            },
            {
              page: 'Контрагенти',
              pageKey: 'nav.contractors',
              link: '/analytics-contractors',
            },
            {
              page: 'Форми оплати',
              pageKey: 'nav.paymentForms',
              link: '/analytics-payment-forms',
            },
            {
              page: 'Статті витрат',
              pageKey: 'nav.expenseCategories',
              link: '/analytics-expense-categories',
            },
            {
              page: 'Валюти',
              pageKey: 'nav.currencies',
              link: '/analytics-currencies',
            },
            ...(showFinanceGoogleSheets
              ? [
                  {
                    page: 'Google Sheets',
                    pageKey: 'nav.googleSheets',
                    link: '/analytics-google-sheets',
                  },
                ]
              : []),
          ],
        },
      ],
    },
    {
      roles: [UserRole.ACCOUNTANT],
      pages: [
        {
          page: 'Всі заявки',
          pageKey: 'nav.allRequests',
          link: `/requests`,
          icon: 'files',
        },
        {
          page: 'Мої заявки',
          pageKey: 'nav.myRequests',
          link: `/my-requests`,
          icon: 'file',
        },
        {
          page: 'Повернення коштів',
          pageKey: 'nav.refunds',
          link: `/my-refunds`,
          icon: 'refund',
        },
        {
          page: 'Мій бюджет',
          pageKey: 'nav.myBudget',
          link: `/my-budgeting`,
          icon: 'coins',
        },
        {
          page: 'Пошук',
          pageKey: 'nav.search',
          link: `/search`,
          icon: 'search-crm',
        },
        {
          page: 'Історія',
          pageKey: 'nav.history',
          icon: 'history',
          children: [
            {
              page: 'Заявки історія',
              pageKey: 'nav.requestHistory',
              link: '/history-requests',
            },
            {
              page: 'Бюджетування історія',
              pageKey: 'nav.budgetingHistory',
              link: '/history-budgeting',
            },
          ],
        },
        {
          page: 'Аналітика',
          pageKey: 'nav.analytics',
          icon: 'analytics',
          children: [
            {
              page: 'Загальна аналітика',
              pageKey: 'nav.totalAnalytics',
              link: '/analytics-total',
            },
            {
              page: 'Департаменти',
              pageKey: 'nav.departments',
              link: '/analytics-departments',
            },
            {
              page: 'Користувачі',
              pageKey: 'nav.users',
              link: '/analytics-users',
            },
            {
              page: 'Контрагенти',
              pageKey: 'nav.contractors',
              link: '/analytics-contractors',
            },
            {
              page: 'Форми оплати',
              pageKey: 'nav.paymentForms',
              link: '/analytics-payment-forms',
            },
            {
              page: 'Статті витрат',
              pageKey: 'nav.expenseCategories',
              link: '/analytics-expense-categories',
            },
            {
              page: 'Валюти',
              pageKey: 'nav.currencies',
              link: '/analytics-currencies',
            },
            ...(showAccountantGoogleSheets
              ? [
                  {
                    page: 'Google Sheets',
                    pageKey: 'nav.googleSheets',
                    link: '/analytics-google-sheets',
                  },
                ]
              : []),
          ],
        },
      ],
    },
  ];
};
