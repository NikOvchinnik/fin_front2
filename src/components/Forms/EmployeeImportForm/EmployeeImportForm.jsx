import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Notify } from 'notiflix';
import {
  EMPLOYEE_REQUIRED_MESSAGE,
  buildEmployeePayload,
  employeeFields,
  employeeImportAliases,
  findEmployeeDuplicate,
  normalizeComparableValue,
  requiredEmployeeFields,
} from '../../../helpers/employees';
import { importEmployees } from '../../../helpers/axios/employees';
import style from './EmployeeImportForm.module.css';

const normalizeHeader = value => normalizeComparableValue(value);

const getInitialMapping = headers => {
  return employeeFields.reduce((acc, field) => {
    const aliases = employeeImportAliases[field.key] ?? [];
    const header = headers.find(item =>
      aliases.some(alias => normalizeHeader(alias) === normalizeHeader(item))
    );
    acc[field.key] = header ?? '';
    return acc;
  }, {});
};

const mapRow = (row, mapping) =>
  employeeFields.reduce((acc, field) => {
    const sourceHeader = mapping[field.key];
    acc[field.key] = sourceHeader ? row[sourceHeader] ?? '' : '';
    return acc;
  }, {});

const validateRows = (rows, mapping, employees) => {
  const seenTaxIds = new Set();
  const seenPairs = new Set();

  return rows.reduce(
    (acc, row, index) => {
      const employee = buildEmployeePayload(mapRow(row, mapping));
      const rowNumber = index + 2;
      const errors = [];
      const warnings = [];

      requiredEmployeeFields.forEach(field => {
        if (!employee[field]) errors.push(EMPLOYEE_REQUIRED_MESSAGE);
      });

      if (employee.tax_id && !/^\d+$/.test(employee.tax_id)) {
        errors.push('ІПН має містити тільки цифри.');
      }

      const pairKey = `${normalizeComparableValue(employee.tax_id)}|${normalizeComparableValue(
        employee.accounting_full_name
      )}`;
      const taxIdKey = normalizeComparableValue(employee.tax_id);

      if (pairKey !== '|' && seenPairs.has(pairKey)) {
        errors.push('Дубль ІПН + ПІБ 1С у файлі.');
      }

      if (taxIdKey && seenTaxIds.has(taxIdKey)) {
        errors.push('Дубль ІПН у файлі.');
      }

      const duplicate = findEmployeeDuplicate(employees, employee);

      if (duplicate?.type === 'error') {
        errors.push(
          duplicate.reason === 'tax_id'
            ? 'Співробітник з таким ІПН вже існує.'
            : 'Співробітник з таким ІПН і ПІБ 1С вже існує.'
        );
      }

      if (duplicate?.type === 'warning') {
        warnings.push('Схоже ПІБ з уже наявним співробітником.');
      }

      if (errors.length > 0) {
        acc.errors.push({
          row: rowNumber,
          fullName: employee.local_full_name || employee.accounting_full_name,
          reason: [...new Set(errors)].join(' '),
        });
      } else {
        acc.validRows.push(employee);
        warnings.forEach(reason =>
          acc.warnings.push({
            row: rowNumber,
            fullName: employee.local_full_name || employee.accounting_full_name,
            reason,
          })
        );
      }

      if (taxIdKey) seenTaxIds.add(taxIdKey);
      if (pairKey !== '|') seenPairs.add(pairKey);

      return acc;
    },
    { validRows: [], errors: [], warnings: [] }
  );
};

const getDuplicateErrorsCount = errors =>
  errors.filter(item => /дубль|вже існує/i.test(item.reason)).length;

const EmployeeImportForm = ({ employees = [], closeModal, onRefresh }) => {
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const validation = useMemo(() => {
    if (!rows.length || !headers.length) {
      return { validRows: [], errors: [], warnings: [] };
    }

    return validateRows(rows, mapping, employees);
  }, [rows, headers, mapping, employees]);

  const missingRequiredMapping = requiredEmployeeFields.filter(
    field => !mapping[field]
  );

  const handleFileChange = event => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: header => header.trim(),
      complete: parsed => {
        const parsedHeaders = parsed.meta.fields?.filter(Boolean) ?? [];
        const parsedRows = parsed.data.filter(row =>
          Object.values(row).some(value => String(value ?? '').trim() !== '')
        );

        setHeaders(parsedHeaders);
        setRows(parsedRows);
        setMapping(getInitialMapping(parsedHeaders));
      },
      error: () => {
        Notify.failure('Не вдалося прочитати файл.');
      },
    });
  };

  const handleMappingChange = (fieldKey, value) => {
    setMapping(prev => ({ ...prev, [fieldKey]: value }));
    setResult(null);
  };

  const handleImport = async () => {
    if (!rows.length) {
      Notify.failure('Оберіть файл для імпорту.');
      return;
    }

    if (missingRequiredMapping.length > 0) {
      Notify.failure('Замапте обов’язкові поля перед імпортом.');
      return;
    }

    if (validation.validRows.length === 0) {
      setResult({
        imported: 0,
        skipped_duplicates: getDuplicateErrorsCount(validation.errors),
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    setIsImporting(true);

    try {
      const response = await importEmployees({
        creation_source: 'import',
        employees: validation.validRows,
      });

      await onRefresh();
      setResult({
        imported: response?.imported ?? validation.validRows.length,
        skipped_duplicates:
          response?.skipped_duplicates ??
          getDuplicateErrorsCount(validation.errors),
        errors: response?.errors ?? validation.errors,
        warnings: validation.warnings,
      });
      Notify.success('Імпорт співробітників завершено.');
    } catch {
      Notify.failure('Сталася помилка імпорту, спробуйте ще раз');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={style.container}>
      <h2 className={style.title}>Імпорт з таблиці</h2>

      <div className={style.fileRow}>
        <label className={style.fileButton}>
          Обрати файл
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={handleFileChange}
            className={style.fileInput}
          />
        </label>
        <span className={style.fileName}>{fileName || 'Файл не обрано'}</span>
      </div>

      {headers.length > 0 && (
        <>
          <div className={style.summary}>
            <span>Рядків у файлі: {rows.length}</span>
            <span>Валідні: {validation.validRows.length}</span>
            <span>Помилки: {validation.errors.length}</span>
            <span>Попередження: {validation.warnings.length}</span>
          </div>

          <div className={style.mappingGrid}>
            {employeeFields.map(field => (
              <label key={field.key} className={style.mappingItem}>
                <span>
                  {field.label}
                  {requiredEmployeeFields.includes(field.key) ? ' *' : ''}
                </span>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={event =>
                    handleMappingChange(field.key, event.target.value)
                  }
                >
                  <option value="">Не мапити</option>
                  {headers.map(header => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </>
      )}

      {validation.errors.length > 0 && (
        <div className={style.detailsBlock}>
          <h3>Помилки попередньої перевірки</h3>
          <ul>
            {validation.errors.slice(0, 12).map(item => (
              <li key={`${item.row}-${item.reason}`}>
                Рядок {item.row}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className={style.warningBlock}>
          <h3>Попередження</h3>
          <ul>
            {validation.warnings.slice(0, 12).map(item => (
              <li key={`${item.row}-${item.reason}`}>
                Рядок {item.row}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className={style.resultBlock}>
          <h3>Результат імпорту</h3>
          <p>Імпортовано: {result.imported}</p>
          <p>Пропущено як дубль: {result.skipped_duplicates}</p>
          <p>Помилки: {result.errors?.length ?? 0}</p>
        </div>
      )}

      <div className={style.actions}>
        <button type="button" className={style.secondaryBtn} onClick={closeModal}>
          Закрити
        </button>
        <button
          type="button"
          className={style.primaryBtn}
          onClick={handleImport}
          disabled={isImporting}
        >
          {isImporting ? 'Імпортуємо...' : 'Імпортувати валідні записи'}
        </button>
      </div>
    </div>
  );
};

export default EmployeeImportForm;
