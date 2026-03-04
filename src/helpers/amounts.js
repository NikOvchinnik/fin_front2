export const formatMoney = amount =>
  amount != null
    ? amount.toLocaleString('uk-UA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : '';

export const getEffectiveCurrencyRate = entity =>
  entity?.effective_currency_rate ??
  entity?.currency_rate_at_approval ??
  entity?.currency_rate ??
  entity?.currency?.rate ??
  null;

export const getRequestAmountUah = request => {
  if (request?.amount_uah != null) return request.amount_uah;
  if (request?.paid_in_uah != null) return request.paid_in_uah;

  const rate = getEffectiveCurrencyRate(request);

  return request?.amount != null && rate != null ? request.amount * rate : null;
};

export const getBudgetingAmountUah = (request, mode) => {
  if (mode === 'optimistic') {
    if (request?.amount_optimistic_uah != null) return request.amount_optimistic_uah;
    const rate = getEffectiveCurrencyRate(request);

    return request?.amount_optimistic != null && rate != null
      ? request.amount_optimistic * rate
      : null;
  }

  if (request?.amount_pessimistic_uah != null) return request.amount_pessimistic_uah;

  const rate = getEffectiveCurrencyRate(request);

  return request?.amount_pessimistic != null && rate != null
    ? request.amount_pessimistic * rate
    : null;
};
