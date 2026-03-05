import { useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import style from './GoogleSheetImportForm.module.css';
import { importFromGoogleSheet } from '../../../helpers/axios/imports';

const GOOGLE_SHEET_URL_REGEXP =
  /^https?:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+(?:\/.*)?$/;

const IMPORT_STATUS_LABEL = {
  success: 'Успішно',
  partial_success: 'Частково успішно',
  failed: 'Неуспішно',
};

const IMPORT_STATUS_CLASS = {
  success: 'statusSuccess',
  partial_success: 'statusPartial',
  failed: 'statusFailed',
};

const getErrorMessage = error => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    'Сталася помилка імпорту, спробуйте ще раз'
  );
};

const flattenTabErrors = tabs =>
  (tabs || []).flatMap(tab =>
    (tab.errors || []).map(error => ({
      tabName: tab.tab_name || '-',
      rowNumber: error.row_number ?? '-',
      message: error.message || 'Помилка валідації',
    }))
  );

const GoogleSheetImportForm = ({
  title = 'Імпорт з Google Sheets',
  importType,
  closeModal,
  onImported,
}) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flattenedErrors = useMemo(
    () => flattenTabErrors(result?.tabs),
    [result?.tabs]
  );

  const handleSubmit = async event => {
    event.preventDefault();
    const trimmedUrl = sheetUrl.trim();

    setFormError('');
    setRequestError('');

    if (!trimmedUrl) {
      setFormError('Вкажіть посилання на Google Sheets');
      return;
    }

    if (!GOOGLE_SHEET_URL_REGEXP.test(trimmedUrl)) {
      setFormError('Вкажіть валідне посилання Google Sheets');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await importFromGoogleSheet({
        sheet_url: trimmedUrl,
        import_type: importType,
      });

      setResult(response);

      if (response.status === 'success') {
        Notify.success('Імпорт виконано успішно');
      } else if (response.status === 'partial_success') {
        Notify.warning('Імпорт виконано частково');
      } else {
        Notify.failure('Імпорт завершився з помилкою');
      }

      if (
        (response.status === 'success' || response.status === 'partial_success') &&
        onImported
      ) {
        await onImported();
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setRequestError(message);
      Notify.failure(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={style.container}>
      <h2 className={style.title}>{title}</h2>

      <form className={style.form} onSubmit={handleSubmit}>
        <label className={style.label} htmlFor={`sheet-url-${importType}`}>
          Посилання на Google Sheets
        </label>
        <input
          id={`sheet-url-${importType}`}
          type="text"
          className={style.input}
          value={sheetUrl}
          onChange={event => {
            setSheetUrl(event.target.value);
            setResult(null);
            setRequestError('');
          }}
          disabled={isSubmitting}
          placeholder="https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0"
        />

        {formError && <p className={style.validationError}>{formError}</p>}
        {requestError && <p className={style.requestError}>{requestError}</p>}

        <div className={style.buttonsRow}>
          <button
            type="submit"
            className={style.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Імпортуємо...' : 'Імпортувати'}
          </button>
          <button
            type="button"
            className={style.cancelBtn}
            disabled={isSubmitting}
            onClick={closeModal}
          >
            Закрити
          </button>
        </div>
      </form>

      {result && (
        <div className={style.resultContainer}>
          <div className={style.statusRow}>
            <span
              className={`${style.statusBadge} ${
                style[IMPORT_STATUS_CLASS[result.status] || 'statusFailed']
              }`}
            >
              {IMPORT_STATUS_LABEL[result.status] || result.status}
            </span>
            {result.job_id != null && (
              <span className={style.jobId}>Job ID: {result.job_id}</span>
            )}
          </div>

          <div className={style.summaryGrid}>
            <div className={style.summaryItem}>
              <p className={style.summaryLabel}>Всього рядків</p>
              <p className={style.summaryValue}>
                {result.summary?.total_rows ?? 0}
              </p>
            </div>
            <div className={style.summaryItem}>
              <p className={style.summaryLabel}>Імпортовано</p>
              <p className={style.summaryValue}>
                {result.summary?.imported_rows ?? 0}
              </p>
            </div>
            <div className={style.summaryItem}>
              <p className={style.summaryLabel}>З помилками</p>
              <p className={style.summaryValue}>
                {result.summary?.failed_rows ?? 0}
              </p>
            </div>
          </div>

          {flattenedErrors.length > 0 && (
            <div className={style.errorsContainer}>
              <p className={style.errorsTitle}>Деталі помилок</p>
              <div className={style.errorsTableWrapper}>
                <table className={style.errorsTable}>
                  <thead>
                    <tr>
                      <th>Вкладка</th>
                      <th>Рядок</th>
                      <th>Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flattenedErrors.map((error, index) => (
                      <tr key={`${error.tabName}-${error.rowNumber}-${index}`}>
                        <td>{error.tabName}</td>
                        <td>{error.rowNumber}</td>
                        <td>{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleSheetImportForm;
