import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Notify } from 'notiflix';
import Form from '../../Form/Form';
import Loader from '../../Loader/Loader';
import style from './BulkBudgetingForm.module.css';
import { getCurrencies, getExpenseCategories } from '../../../helpers/axios/payments';
import { getUnits } from '../../../helpers/axios/units';
import { getSubdivisions } from '../../../helpers/axios/subdivisions';
import { mapSubdivisionOptions } from '../../../helpers/departmentField';
import { isFinanceRole } from '../../../helpers/roles';
import { generateDefaultPeriods } from '../../../helpers/periods';
import { getWeeksOfMonth } from '../../../helpers/budgetingWeekOptions';
import {
  distributeEvenly,
  generateMonthRange,
  roundTo2,
} from '../../../helpers/budgetingDistribution';
import { createBulkBudgeting } from '../../../helpers/axios/budgeting';
import { useSelector } from 'react-redux';
import { selectUserName, selectUserRole } from '../../../redux/auth/selectors';

const PERIOD_OPTIONS = generateDefaultPeriods(36);

const firstWeekOfMonth = period => getWeeksOfMonth(period)[0]?.value || '';

const BulkBudgetingForm = ({ closeModal, onRefresh }) => {
  const userName = useSelector(selectUserName);
  const userRole = useSelector(selectUserRole);
  const canViewSubdivision = isFinanceRole(userRole);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);
  const [subdivisionOptions, setSubdivisionOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);

  const [sharedValues, setSharedValues] = useState({
    unit: '',
    subdivision_id: '',
    expense_category_id: '',
    purpose: '',
    currency: '',
    comment: '',
  });

  const defaultPeriod = dayjs().format('MM.YYYY');
  const [startPeriod, setStartPeriod] = useState(defaultPeriod);
  const [endPeriod, setEndPeriod] = useState(defaultPeriod);
  const [totalOptimistic, setTotalOptimistic] = useState('');
  const [totalPessimistic, setTotalPessimistic] = useState('');
  const [entries, setEntries] = useState({});

  const months = useMemo(
    () => generateMonthRange(startPeriod, endPeriod),
    [startPeriod, endPeriod]
  );

  const redistribute = (opt = totalOptimistic, pes = totalPessimistic) => {
    const optimisticValues = distributeEvenly(Number(opt) || 0, months.length);
    const pessimisticValues = distributeEvenly(Number(pes) || 0, months.length);

    const next = {};
    months.forEach((period, index) => {
      next[period] = {
        amount_optimistic: optimisticValues[index] ?? 0,
        amount_pessimistic: pessimisticValues[index] ?? 0,
      };
    });
    setEntries(next);
  };

  useEffect(() => {
    redistribute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months.join(',')]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const units = await getUnits();
        setUnitOptions(units.map(p => ({ value: p.id, label: p.name })));

        if (canViewSubdivision) {
          const subdivisions = await getSubdivisions();
          setSubdivisionOptions(mapSubdivisionOptions(subdivisions));
        }

        const currencies = await getCurrencies();
        setCurrencyOptions(currencies.map(c => ({ value: c.id, label: c.name })));

        const expenseCategories = await getExpenseCategories();
        setExpenseCategoryOptions(
          expenseCategories
            .filter(e => e.is_active)
            .map(e => ({ value: e.id, label: e.name }))
        );
      } catch {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canViewSubdivision]);

  const handleEntryChange = (period, key, rawValue) => {
    const value = rawValue.replace(',', '.').replace(/[^0-9.]/g, '');
    setEntries(prev => ({
      ...prev,
      [period]: { ...prev[period], [key]: value },
    }));
  };

  const sums = useMemo(() => {
    const distributedOptimistic = months.reduce(
      (acc, period) => acc + (Number(entries[period]?.amount_optimistic) || 0),
      0
    );
    const distributedPessimistic = months.reduce(
      (acc, period) => acc + (Number(entries[period]?.amount_pessimistic) || 0),
      0
    );

    return {
      distributedOptimistic: roundTo2(distributedOptimistic),
      distributedPessimistic: roundTo2(distributedPessimistic),
      remainderOptimistic: roundTo2((Number(totalOptimistic) || 0) - distributedOptimistic),
      remainderPessimistic: roundTo2((Number(totalPessimistic) || 0) - distributedPessimistic),
    };
  }, [entries, months, totalOptimistic, totalPessimistic]);

  const hasNegativeAmount = months.some(period => {
    const entry = entries[period] || {};
    return Number(entry.amount_optimistic) < 0 || Number(entry.amount_pessimistic) < 0;
  });

  const sharedFieldsFilled =
    sharedValues.unit &&
    sharedValues.expense_category_id &&
    sharedValues.purpose.trim() &&
    sharedValues.currency;

  const canSubmit =
    sharedFieldsFilled &&
    months.length > 0 &&
    !hasNegativeAmount &&
    Math.abs(sums.remainderOptimistic) < 0.005 &&
    Math.abs(sums.remainderPessimistic) < 0.005;

  const handleSubmit = async action => {
    if (!canSubmit) {
      Notify.failure(
        "Перевірте обов'язкові поля та розподіл сум — залишок має дорівнювати нулю."
      );
      return;
    }

    setSaving(true);
    try {
      await createBulkBudgeting({
        action,
        applicant: userName,
        unit: sharedValues.unit,
        subdivision_id: canViewSubdivision ? sharedValues.subdivision_id || null : null,
        purpose: sharedValues.purpose.trim(),
        expense_category_id: sharedValues.expense_category_id,
        currency: sharedValues.currency,
        comment: sharedValues.comment.trim(),
        entries: months.map(period => ({
          period,
          week: firstWeekOfMonth(period),
          amount_optimistic: roundTo2(entries[period]?.amount_optimistic),
          amount_pessimistic: roundTo2(entries[period]?.amount_pessimistic),
        })),
      });
      onRefresh();
      closeModal();
      Notify.success(`Створено ${months.length} бюджет(ів).`);
    } catch (error) {
      Notify.failure(
        error?.response?.data?.message || 'Сталася помилка, спробуйте ще раз'
      );
      console.error('Error: ', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={style.container}>
      <h3 className={style.title}>Створити регулярний бюджет</h3>

      <h4 className={style.sectionTitle}>Спільні дані</h4>
      <label className={style.field}>
        <span className={style.fieldLabel}>Заявник</span>
        <input type="text" className={style.fieldInput} value={userName} disabled readOnly />
      </label>
      <div className={style.fieldsGrid}>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'autocomplete-select',
                name: 'unit',
                label: 'Підрозділ',
                options: unitOptions,
                onChange: option =>
                  setSharedValues(prev => ({ ...prev, unit: option?.value ?? option ?? '' })),
              },
            ]}
            defaultValues={{ unit: sharedValues.unit }}
          />
        </div>
        {canViewSubdivision && (
          <div className={style.selectField}>
            <Form
              asForm={false}
              fields={[
                {
                  type: 'autocomplete-select',
                  name: 'subdivision_id',
                  label: 'Subdivision',
                  options: subdivisionOptions,
                  onChange: option =>
                    setSharedValues(prev => ({
                      ...prev,
                      subdivision_id: option?.value ?? option ?? '',
                    })),
                },
              ]}
              defaultValues={{ subdivision_id: sharedValues.subdivision_id }}
            />
          </div>
        )}
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'autocomplete-select',
                name: 'expense_category_id',
                label: 'Стаття витрат',
                options: expenseCategoryOptions,
                onChange: option =>
                  setSharedValues(prev => ({
                    ...prev,
                    expense_category_id: option?.value ?? option ?? '',
                  })),
              },
            ]}
            defaultValues={{ expense_category_id: sharedValues.expense_category_id }}
          />
        </div>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'select',
                name: 'currency',
                label: 'Валюта',
                options: currencyOptions,
                onChange: value => setSharedValues(prev => ({ ...prev, currency: value })),
              },
            ]}
            defaultValues={{ currency: sharedValues.currency }}
          />
        </div>
      </div>
      <label className={style.field}>
        <span className={style.fieldLabel}>Призначення *</span>
        <textarea
          className={style.fieldTextarea}
          value={sharedValues.purpose}
          onChange={e => setSharedValues(prev => ({ ...prev, purpose: e.target.value }))}
        />
      </label>
      <label className={style.field}>
        <span className={style.fieldLabel}>Коментар</span>
        <textarea
          className={style.fieldTextarea}
          value={sharedValues.comment}
          onChange={e => setSharedValues(prev => ({ ...prev, comment: e.target.value }))}
        />
      </label>

      <h4 className={style.sectionTitle}>Період і суми</h4>
      <div className={style.fieldsGrid}>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'select',
                name: 'startPeriod',
                label: 'Період з',
                options: PERIOD_OPTIONS,
                onChange: value => setStartPeriod(value),
              },
            ]}
            defaultValues={{ startPeriod }}
          />
        </div>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'select',
                name: 'endPeriod',
                label: 'Період по',
                options: PERIOD_OPTIONS,
                onChange: value => setEndPeriod(value),
              },
            ]}
            defaultValues={{ endPeriod }}
          />
        </div>
      </div>
      {months.length === 0 && (
        <p className={style.warningText}>
          Період «по» має бути не раніше періоду «з».
        </p>
      )}

      <div className={style.fieldsGrid}>
        <label className={style.field}>
          <span className={style.fieldLabel}>Загальна оптимістична сума</span>
          <input
            type="text"
            inputMode="decimal"
            className={style.fieldInput}
            value={totalOptimistic}
            onChange={e =>
              setTotalOptimistic(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))
            }
          />
        </label>
        <label className={style.field}>
          <span className={style.fieldLabel}>Загальна песимістична сума</span>
          <input
            type="text"
            inputMode="decimal"
            className={style.fieldInput}
            value={totalPessimistic}
            onChange={e =>
              setTotalPessimistic(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))
            }
          />
        </label>
        <button
          type="button"
          className={style.distributeBtn}
          onClick={() => redistribute()}
          disabled={months.length === 0}
        >
          Розподілити порівну
        </button>
      </div>

      {months.length > 0 && (
        <div className={style.tableWrapper}>
          <table className={style.table}>
            <thead>
              <tr>
                <th>Місяць</th>
                <th>Оптимістична</th>
                <th>Песимістична</th>
              </tr>
            </thead>
            <tbody>
              {months.map(period => (
                <tr key={period}>
                  <td>{period}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={style.cellInput}
                      value={entries[period]?.amount_optimistic ?? ''}
                      onChange={e =>
                        handleEntryChange(period, 'amount_optimistic', e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={style.cellInput}
                      value={entries[period]?.amount_pessimistic ?? ''}
                      onChange={e =>
                        handleEntryChange(period, 'amount_pessimistic', e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={style.summaryRow}>
            <div className={style.summaryBlock}>
              <span>Оптимістична — розподілено: {sums.distributedOptimistic}</span>
              <span className={Math.abs(sums.remainderOptimistic) >= 0.005 ? style.summaryError : ''}>
                Залишок: {sums.remainderOptimistic}
              </span>
            </div>
            <div className={style.summaryBlock}>
              <span>Песимістична — розподілено: {sums.distributedPessimistic}</span>
              <span className={Math.abs(sums.remainderPessimistic) >= 0.005 ? style.summaryError : ''}>
                Залишок: {sums.remainderPessimistic}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={style.actions}>
        <button
          type="button"
          className={style.cancelBtn}
          onClick={closeModal}
          disabled={saving}
        >
          Скасувати
        </button>
        <button
          type="button"
          className={style.draftBtn}
          onClick={() => handleSubmit('draft')}
          disabled={saving || !canSubmit}
        >
          {saving ? 'Зберігаю...' : 'Зберегти чернетки'}
        </button>
        <button
          type="button"
          className={style.submitBtn}
          onClick={() => handleSubmit('send')}
          disabled={saving || !canSubmit}
        >
          {saving ? 'Зберігаю...' : 'Відправити на затвердження'}
        </button>
      </div>
    </div>
  );
};

export default BulkBudgetingForm;
