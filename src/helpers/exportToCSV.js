import dayjs from 'dayjs';

export const exportToCSV = ({ rows, columns, filePrefix = 'new-file' }) => {
  if (!rows || rows.length === 0) return;

  const headers = columns.map(col => {
    if (typeof col.header === 'string') return col.header;
    if (col.header?.props?.children) {
      const p = col.header.props.children.find?.(c => c?.type === 'p');
      if (p && typeof p.props.children === 'string') {
        return p.props.children;
      }
    }
    return col.accessorKey;
  });

  const dataRows = rows.map(row =>
    columns.map(col => {
      const plainKey = `${col.accessorKey}_plain`;
      const value = row[plainKey] ?? '';
      return `"${String(value).replace(/"/g, '""')}"`;
    })
  );

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...dataRows.map(r => r.join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `${filePrefix}_${dayjs().format('YYYY-MM-DD')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
