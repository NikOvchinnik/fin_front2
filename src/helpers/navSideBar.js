import { UserRole } from './enums';

export const getNavSideBar = (userId, userName) => [
  {
    roles: [UserRole.CEO],
    pages: [
      {
        page: 'Користувачі',
        link: `/users`,
        icon: 'users',
      },
      {
        page: 'Всі заявки',
        link: `/requests`,
        icon: 'files',
      },
      {
        page: 'Мої заявки',
        link: `/my-requests`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my-refunds`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Мій бюджет',
        link: `/my-budgeting`,
        icon: 'coins',
      },
      {
        page: 'Пошук',
        link: `/search`,
        icon: 'search-crm',
      },
      {
        page: 'Аналітика',
        icon: 'analytics',
        children: [
          {
            page: 'Загальна аналітика',
            link: '/analytics-total',
          },
          {
            page: 'Департаменти',
            link: '/analytics-departments',
          },
          {
            page: 'Користувачі',
            link: '/analytics-users',
          },
          {
            page: 'Контрагенти',
            link: '/analytics-contractors',
          },
          {
            page: 'Форми оплати',
            link: '/analytics-payment-forms',
          },
          {
            page: 'Статті витрат',
            link: '/analytics-expense-categories',
          },
          {
            page: 'Валюти',
            link: '/analytics-currencies',
          },
          {
            page: 'Google Sheets',
            link: '/analytics-google-sheets',
          },
        ],
      },
    ],
  },
  {
    roles: [UserRole.HEAD_OF_DEPARTMENT],
    pages: [
      {
        page: 'Користувачі',
        link: `/users`,
        icon: 'users',
      },
      {
        page: 'Мої заявки',
        link: `/my-requests`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my-refunds`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Мій бюджет',
        link: `/my-budgeting`,
        icon: 'coins',
      },
      {
        page: 'Історія',
        icon: 'history',
        children: [
          {
            page: 'Заявки історія',
            link: '/history-requests',
          },
          {
            page: 'Бюджетування історія',
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
        link: `/my-requests`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my-refunds`,
        icon: 'refund',
      },
      {
        page: 'Мій бюджет',
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
        link: `/users`,
        icon: 'users',
      },
      {
        page: 'Всі заявки',
        link: `/requests`,
        icon: 'files',
      },
      {
        page: 'Мої заявки',
        link: `/my-requests`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my-refunds`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Мій бюджет',
        link: `/my-budgeting`,
        icon: 'coins',
      },
      {
        page: 'Пошук',
        link: `/search`,
        icon: 'search-crm',
      },
      {
        page: 'Курс валют',
        link: `/exchange-rate`,
        icon: 'dollar',
      },
      {
        page: 'Історія',
        icon: 'history',
        children: [
          {
            page: 'Заявки історія',
            link: '/history-requests',
          },
          {
            page: 'Бюджетування історія',
            link: '/history-budgeting',
          },
        ],
      },
      {
        page: 'Аналітика',
        icon: 'analytics',
        children: [
          {
            page: 'Загальна аналітика',
            link: '/analytics-total',
          },
          {
            page: 'Департаменти',
            link: '/analytics-departments',
          },
          {
            page: 'Користувачі',
            link: '/analytics-users',
          },
          {
            page: 'Контрагенти',
            link: '/analytics-contractors',
          },
          {
            page: 'Форми оплати',
            link: '/analytics-payment-forms',
          },
          {
            page: 'Статті витрат',
            link: '/analytics-expense-categories',
          },
          {
            page: 'Валюти',
            link: '/analytics-currencies',
          },
          {
            page: 'Google Sheets',
            link: '/analytics-google-sheets',
          },
        ],
      },
    ],
  },
  {
    roles: [UserRole.ACCOUNTANT],
    pages: [
      {
        page: 'Всі заявки',
        link: `/requests`,
        icon: 'files',
      },
      {
        page: 'Мої заявки',
        link: `/my-requests`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my-refunds`,
        icon: 'refund',
      },
      {
        page: 'Мій бюджет',
        link: `/my-budgeting`,
        icon: 'coins',
      },
      {
        page: 'Пошук',
        link: `/search`,
        icon: 'search-crm',
      },
      {
        page: 'Історія',
        icon: 'history',
        children: [
          {
            page: 'Заявки історія',
            link: '/history-requests',
          },
          {
            page: 'Бюджетування історія',
            link: '/history-budgeting',
          },
        ],
      },
      {
        page: 'Аналітика',
        icon: 'analytics',
        children: [
          {
            page: 'Загальна аналітика',
            link: '/analytics-total',
          },
          {
            page: 'Департаменти',
            link: '/analytics-departments',
          },
          {
            page: 'Користувачі',
            link: '/analytics-users',
          },
          {
            page: 'Контрагенти',
            link: '/analytics-contractors',
          },
          {
            page: 'Форми оплати',
            link: '/analytics-payment-forms',
          },
          {
            page: 'Статті витрат',
            link: '/analytics-expense-categories',
          },
          {
            page: 'Валюти',
            link: '/analytics-currencies',
          },
          {
            page: 'Google Sheets',
            link: '/analytics-google-sheets',
          },
        ],
      },
    ],
  },
];
