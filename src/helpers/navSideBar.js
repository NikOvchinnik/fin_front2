export const getNavSideBar = (userId, userName) => [
  {
    roles: [1],
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
        link: `/my_requests/${userId}`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my_refunds/${userId}`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Мій бюджет',
        link: `/my_budgeting/${userId}`,
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
        ],
      },
    ],
  },
  {
    roles: [2],
    pages: [
      {
        page: 'Користувачі',
        link: `/users`,
        icon: 'users',
      },
      {
        page: 'Мої заявки',
        link: `/my_requests/${userId}`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my_refunds/${userId}`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Мій бюджет',
        link: `/my_budgeting/${userId}`,
        icon: 'coins',
      },
      {
        page: 'Історія',
        icon: 'history',
        children: [
          {
            page: 'Заявки історія',
            link: '/history_requests',
          },
          {
            page: 'Бюджетування історія',
            link: '/history_budgeting',
          },
        ],
      },
    ],
  },
  {
    roles: [3],
    pages: [
      {
        page: 'Мої заявки',
        link: `/my_requests/${userId}`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my_refunds/${userId}`,
        icon: 'refund',
      },
      {
        page: 'Мій бюджет',
        link: `/my_budgeting/${userId}`,
        icon: 'coins',
      },
    ],
  },
  {
    roles: [4],
    pages: [
      {
        page: 'Всі заявки',
        link: `/requests`,
        icon: 'files',
      },
      {
        page: 'Мої заявки',
        link: `/my_requests/${userId}`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my_refunds/${userId}`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Мій бюджет',
        link: `/my_budgeting/${userId}`,
        icon: 'coins',
      },
      {
        page: 'Пошук',
        link: `/search`,
        icon: 'search-crm',
      },
      {
        page: 'Курс валют',
        link: `/exchange_rate`,
        icon: 'dollar',
      },
      {
        page: 'Історія',
        icon: 'history',
        children: [
          {
            page: 'Заявки історія',
            link: '/history_requests',
          },
          {
            page: 'Бюджетування історія',
            link: '/history_budgeting',
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
        ],
      },
    ],
  },
  {
    roles: [5],
    pages: [
      {
        page: 'Всі заявки',
        link: `/requests`,
        icon: 'files',
      },
      {
        page: 'Мої заявки',
        link: `/my_requests/${userId}`,
        icon: 'file',
      },
      {
        page: 'Повернення коштів',
        link: `/my_refunds/${userId}`,
        icon: 'refund',
      },
      {
        page: 'Мій бюджет',
        link: `/my_budgeting/${userId}`,
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
            link: '/history_requests',
          },
          {
            page: 'Бюджетування історія',
            link: '/history_budgeting',
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
        ],
      },
    ],
  },
];
