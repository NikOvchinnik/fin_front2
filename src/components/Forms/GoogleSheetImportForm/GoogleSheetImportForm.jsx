import { useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import style from './GoogleSheetImportForm.module.css';
import { importFromGoogleSheet } from '../../../helpers/axios/imports';
import { useTranslation } from 'react-i18next';

const GOOGLE_SHEET_URL_REGEXP =
  /^https?:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+(?:\/.*)?$/;

const IMPORT_STATUS_CLASS = {
  success: 'statusSuccess',
  partial_success: 'statusPartial',
  failed: 'statusFailed',
};

const getErrorMessage = (error, t) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    t('import.error')
  );
};

const flattenTabErrors = (tabs, t) =>
  (tabs || []).flatMap(tab =>
    (tab.errors || []).map(error => ({
      tabName: tab.tab_name || '-',
      rowNumber: error.row_number ?? '-',
      message: error.message || t('import.validationError'),
    }))
  );

const GoogleSheetImportForm = ({
  title,
  importType,
  closeModal,
  onImported,
}) => {
  const { t } = useTranslation();
  const [sheetUrl, setSheetUrl] = useState('');
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flattenedErrors = useMemo(
    () => flattenTabErrors(result?.tabs, t),
    [result?.tabs, t]
  );

  const handleSubmit = async event => {
    event.preventDefault();
    const trimmedUrl = sheetUrl.trim();

    setFormError('');
    setRequestError('');

    if (!trimmedUrl) {
      setFormError(t('import.urlRequired'));
      return;
    }

    if (!GOOGLE_SHEET_URL_REGEXP.test(trimmedUrl)) {
      setFormError(t('import.invalidUrl'));
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
        Notify.success(t('import.success'));
      } else if (response.status === 'partial_success') {
        Notify.warning(t('import.partial'));
      } else {
        Notify.failure(t('import.failed'));
      }

      if (
        (response.status === 'success' || response.status === 'partial_success') &&
        onImported
      ) {
        await onImported();
      }
    } catch (error) {
      const message = getErrorMessage(error, t);
      setRequestError(message);
      Notify.failure(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={style.container}>
      <h2 className={style.title}>{title || t('import.title')}</h2>

      <form className={style.form} onSubmit={handleSubmit}>
        <label className={style.label} htmlFor={`sheet-url-${importType}`}>
          {t('import.sheetUrl')}
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
            {isSubmitting ? t('actions.importing') : t('actions.import')}
          </button>
          <button
            type="button"
            className={style.cancelBtn}
            disabled={isSubmitting}
            onClick={closeModal}
          >
            {t('common.close')}
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
              {t(
                result.status === 'success'
                  ? 'import.statusSuccess'
                  : result.status === 'partial_success'
                  ? 'import.statusPartial'
                  : 'import.statusFailed'
              )}
            </span>
            {result.job_id != null && (
              <span className={style.jobId}>Job ID: {result.job_id}</span>
            )}
          </div>

          <div className={style.summaryGrid}>
            <div className={style.summaryItem}>
              <p className={style.summaryLabel}>{t('import.totalRows')}</p>
              <p className={style.summaryValue}>
                {result.summary?.total_rows ?? 0}
              </p>
            </div>
            <div className={style.summaryItem}>
              <p className={style.summaryLabel}>{t('import.imported')}</p>
              <p className={style.summaryValue}>
                {result.summary?.imported_rows ?? 0}
              </p>
            </div>
            <div className={style.summaryItem}>
              <p className={style.summaryLabel}>{t('import.failedRows')}</p>
              <p className={style.summaryValue}>
                {result.summary?.failed_rows ?? 0}
              </p>
            </div>
          </div>

          {flattenedErrors.length > 0 && (
            <div className={style.errorsContainer}>
              <p className={style.errorsTitle}>{t('import.errorDetails')}</p>
              <div className={style.errorsTableWrapper}>
                <table className={style.errorsTable}>
                  <thead>
                    <tr>
                      <th>{t('import.tab')}</th>
                      <th>{t('import.row')}</th>
                      <th>{t('import.reason')}</th>
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
