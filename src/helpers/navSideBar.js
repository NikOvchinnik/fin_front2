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
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Історія',
        link: `/history`,
        icon: 'history',
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
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
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
        link: `/refunds`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
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
        link: `/refunds`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
      {
        page: 'Курс валют',
        link: `/exchange_rate`,
        icon: 'dollar',
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
        link: `/refunds`,
        icon: 'refund',
      },
      {
        page: 'Бюджетування',
        link: `/budgeting`,
        icon: 'piggy-bank',
      },
    ],
  },
];
