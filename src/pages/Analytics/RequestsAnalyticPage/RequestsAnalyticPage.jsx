import { useState, useEffect, useCallback } from 'react';
import DocTitle from '../../../components/DocTitle/DocTitle';
import style from './RequestsAnalyticPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../../components/Loader/Loader';
import { getAnalyticsTotal } from '../../../helpers/axios/analytic';
import Table from '../../../components/Table/Table';
import Form from '../../../components/Form/Form';
import Icon from '../../../components/Icon/Icon';
import { exportToCSV } from '../../../helpers/exportToCSV';
import { getUnits } from '../../../helpers/axios/units';
import { useTranslation } from 'react-i18next';

const RequestsAnalyticPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [statisticsRows, setStatisticsRows] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [UnitOptions, setUnitOptions] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const statistics = await getAnalyticsTotal({
        unit: selectedUnit || 'all',
      });

      const units = await getUnits();
      const UnitSelector = [
        { value: 'all', label: t('filters.all') },
        ...(units || []).map(p => ({
          value: p.id,
          label: p.name,
        })),
      ];
      setUnitOptions(UnitSelector);

      const rows = statistics.map(slot => {
        return {
          date: `${slot.year}-${String(slot.month).padStart(2, '0')}`,
          date_plain: `${slot.year}-${String(slot.month).padStart(2, '0')}`,
          paid_count: <p className={style.textRow}>{slot.paid_count}</p>,
          paid_count_plain: slot.paid_count,
          paid_sum: (
            <p className={style.textRow}>
              {slot.paid_sum.toLocaleString('uk-UA', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
          ),
          paid_sum_plain: slot.paid_sum,
          budget_count: <p className={style.textRow}>{slot.budget_count}</p>,
          budget_count_plain: slot.budget_count,
          budget_sum: (
            <p className={style.textRow}>
              {slot.budget_sum.toLocaleString('uk-UA', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
          ),
          budget_sum_plain: slot.budget_sum,
        };
      });

      const totalCount = rows.reduce(
        (sum, row) => sum + row.paid_count_plain,
        0
      );

      const totalSum = rows.reduce((sum, row) => sum + row.paid_sum_plain, 0);

      const budgetCount = rows.reduce(
        (sum, row) => sum + row.budget_count_plain,
        0
      );

      const budgetSum = rows.reduce(
        (sum, row) => sum + row.budget_sum_plain,
        0
      );

      const totalRow = {
        date: <p className={style.titleRow}>{t('common.total')}</p>,
        date_plain: 'Total',
        paid_count: <p className={style.totalTextRow}>{totalCount}</p>,
        paid_count_plain: totalCount,
        paid_sum: (
          <p className={style.totalTextRow}>
            {totalSum.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </p>
        ),
        paid_sum_plain: totalSum,
        budget_count: <p className={style.totalTextRow}>{budgetCount}</p>,
        budget_count_plain: budgetCount,
        budget_sum: (
          <p className={style.totalTextRow}>
            {budgetSum.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </p>
        ),
        budget_sum_plain: budgetSum,
      };

      setStatisticsRows([...rows, totalRow]);
    } catch {
      Notify.failure(t('notifications.genericError'));
    } finally {
      setLoading(false);
    }
  }, [selectedUnit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = key => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  const dataColumns = [
    {
      accessorKey: 'date',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.date')}</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('date')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'paid_count',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.requestsCount')}</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('paid_count')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'paid_sum',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.requestsAmount')}</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('paid_sum')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'budget_count',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.budgetCount')}</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('budget_count')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'budget_sum',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.budgetAmount')}</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('budget_sum')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
  ];

  const sortedData = (() => {
    if (!sortConfig.key) return statisticsRows;

    const dataWithoutTotal = statisticsRows.filter(
      row => row.date_plain !== 'Total'
    );

    const totalRow = statisticsRows.find(row => row.date_plain === 'Total');

    dataWithoutTotal.sort((a, b) => {
      let valA = a[`${sortConfig.key}_plain`] ?? a[sortConfig.key];
      let valB = b[`${sortConfig.key}_plain`] ?? b[sortConfig.key];

      const isPercent = typeof valA === 'string' && valA.includes('%');
      if (isPercent) {
        valA = parseFloat(valA.replace('%', '').trim());
        valB = parseFloat(valB.replace('%', '').trim());
      }

      const isNumber = !isNaN(Number(valA)) && !isNaN(Number(valB));
      if (isNumber) {
        return sortConfig.direction === 'asc'
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA);
      }

      return sortConfig.direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return totalRow ? [...dataWithoutTotal, totalRow] : dataWithoutTotal;
  })();

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>RequestsAnalytic</DocTitle>
          <div className={style.titleContainer}>
            <h2>{t('analytics.total')}</h2>
            <button
              className={style.csvBtn}
              onClick={() =>
                exportToCSV({
                  rows: sortedData,
                  columns: dataColumns,
                  filePrefix: 'statistics',
                })
              }
            >
              {t('common.exportCsv')}
            </button>
          </div>
          <div className={style.formSelectorContainer}>
            <Form
              fields={[
                {
                  type: 'select',
                  name: 'unit',
                  label: t('labels.department'),
                  options: UnitOptions,
                  onChange: value => setSelectedUnit(value),
                },
              ]}
              defaultValues={{
                unit: selectedUnit,
              }}
            />
          </div>
          <Table
            data={sortedData}
            columns={dataColumns}
            visibleColumns={5}
            visibleColumnsMobile={3}
            fixedFirstColumn={true}
          />
        </section>
      )}
    </>
  );
};

export default RequestsAnalyticPage;
