import { useState, useEffect, useCallback } from 'react';
import DocTitle from '../../../components/DocTitle/DocTitle';
import style from './ExpenseCategoriesAnalyticPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../../components/Loader/Loader';
import { getAnalyticsExpenseCategories } from '../../../helpers/axios/analytic';
import Table from '../../../components/Table/Table';
import dayjs from 'dayjs';
import { yearsOptions } from '../../../helpers/years';
import Form from '../../../components/Form/Form';
import Icon from '../../../components/Icon/Icon';
import { exportToCSV } from '../../../helpers/exportToCSV';
import { getProjects } from '../../../helpers/axios/projects';
import { monthsOptionsAll } from '../../../helpers/months';

const ExpenseCategoriesAnalyticPage = () => {
  const [loading, setLoading] = useState(true);
  const [statisticsRows, setStatisticsRows] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [projectOptions, setProjectOptions] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: 'paid_count',
    direction: 'desc',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const statistics = await getAnalyticsExpenseCategories({
        year: selectedYear || 'all',
        month: selectedMonth || 'all',
        project: selectedProject || 'all',
      });

      const projects = await getProjects();
      const projectSelector = [
        { value: 'all', label: 'Всі' },
        ...(projects || []).map(p => ({
          value: p.id,
          label: p.name,
        })),
      ];
      setProjectOptions(projectSelector);

      const rows = statistics.map(slot => {
        return {
          expense_category: slot.expense_category,
          expense_category_plain: slot.expense_category,
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
        expense_category: <p className={style.titleRow}>Total</p>,
        expense_category_plain: 'Total',
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
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedProject]);

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
      accessorKey: 'expense_category',
      header: (
        <div className={style.sortContainer}>
          <p>Стаття витрат</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('expense_category')}
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
          <p>Заявки кількість</p>
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
          <p>Заявки сума</p>
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
          <p>Бюджет кількість</p>
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
          <p>Бюджет сума</p>
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
      row => row.expense_category_plain !== 'Total'
    );

    const totalRow = statisticsRows.find(
      row => row.expense_category_plain === 'Total'
    );

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
          <DocTitle>ExpenseCategoriesAnalytic</DocTitle>
          <div className={style.titleContainer}>
            <h2>Заявки по статті витрат</h2>
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
              Експорт у CSV
            </button>
          </div>
          <div className={style.formSelectorContainer}>
            <Form
              fields={[
                {
                  type: 'select',
                  name: 'project',
                  label: 'Підрозділ',
                  options: projectOptions,
                  onChange: value => setSelectedProject(value),
                },
              ]}
              defaultValues={{
                project: selectedProject,
              }}
            />
            <Form
              fields={[
                {
                  type: 'select',
                  name: 'month',
                  label: 'Місяць',
                  options: monthsOptionsAll,
                  onChange: value => setSelectedMonth(value),
                },
              ]}
              defaultValues={{
                month: selectedMonth,
              }}
            />
            <Form
              fields={[
                {
                  type: 'select',
                  name: 'year',
                  label: 'Рік',
                  options: yearsOptions(),
                  onChange: value => setSelectedYear(value),
                },
              ]}
              defaultValues={{
                year: selectedYear,
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

export default ExpenseCategoriesAnalyticPage;
