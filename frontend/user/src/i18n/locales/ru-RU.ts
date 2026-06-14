import enUS from './en-US'

/** Russian UI — partial translation; falls back to en-US for remaining keys. */
export default {
  ...enUS,
  nav: {
    ...enUS.nav,
    dashboard: 'Панель',
    knowledge: 'База знаний',
    order: 'Заказы',
    invite: 'Приглашения',
    giftCard: 'Подарочные карты',
    plan: 'Подписка',
    node: 'Узлы',
    traffic: 'Трафик',
    ticket: 'Тикеты',
    profile: 'Профиль',
    groupBilling: 'Биллинг',
    groupSubscription: 'Подписка',
    groupAccount: 'Аккаунт',
  },
  common: {
    ...enUS.common,
    loading: 'Загрузка…',
    save: 'Сохранить',
    cancel: 'Отмена',
    submit: 'Отправить',
    confirm: 'Подтвердить',
    logout: 'Выйти',
    success: 'Успешно',
    error: 'Ошибка',
  },
  dashboard: {
    ...enUS.dashboard,
    mySubscription: 'Моя подписка',
    purchaseSubscription: 'Купить подписку',
    shortcut: 'Быстрые действия',
  },
  invite: {
    ...enUS.invite,
    transferAmount: 'Сумма перевода (в единицах валюты)',
    transferAmountRequired: 'Введите сумму перевода',
    transferAmountInvalid: 'Сумма должна быть положительным целым числом',
  },
} as const
