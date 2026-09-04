import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import style from './Table.module.css';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useMediaQuery } from '@mui/material';
import Icon from '../Icon/Icon';

const Table = ({
  data,
  columns,
  visibleColumnsMobile = 1,
  visibleColumns = 4,
  styles,
  fixedFirstColumn = false,
  rowsPerPage = 0,
  enableHorizontalScroll = false,
  onPageRowIdsChange,
  onPageChange,
  onRowClick,
}) => {
  const [visibleColumnIndex, setVisibleColumnIndex] = useState(0);
  const [needsHorizontalScroll, setNeedsHorizontalScroll] = useState(false);
  const scrollContainerRef = useRef(null);

  // fixedFirstColumn лишається сумісним з true/false (0 або 1 зафіксована
  // колонка, як і раніше); число (напр. 2) фіксує стільки перших колонок.
  const fixedCount =
    typeof fixedFirstColumn === 'number'
      ? fixedFirstColumn
      : fixedFirstColumn
      ? 1
      : 0;

  const stickyRefs = useRef([]);
  const [stickyOffsets, setStickyOffsets] = useState([]);

  // Білий фон під зафіксованими клітинками — однаково для всіх сторінок.
  const stickyCellClassName = `${style.stickyColumn} ${style.stickyCell}`;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
    defaultColumn: {
      cell: info => info.getValue(),
    },
    ...(rowsPerPage > 0 && { getPaginationRowModel: getPaginationRowModel() }),
    initialState: {
      ...(rowsPerPage > 0 && {
        pagination: {
          pageSize: rowsPerPage,
          pageIndex: 0,
        },
      }),
    },
  });

  const pageIndex = rowsPerPage > 0 ? table.getState().pagination.pageIndex : 0;

  const prevIdsKeyRef = useRef('');
  const prevPageIndexRef = useRef(pageIndex);

  useEffect(() => {
    // 1) page change callback (тільки якщо реально змінився індекс)
    if (rowsPerPage > 0 && onPageChange && prevPageIndexRef.current !== pageIndex) {
      prevPageIndexRef.current = pageIndex;
      onPageChange(pageIndex);
    }

    // 2) ids for current page (тільки якщо реально змінились)
    if (!onPageRowIdsChange) return;

    const rows = rowsPerPage > 0
      ? table.getPaginationRowModel().rows
      : table.getRowModel().rows;

    const ids = rows
      .map(r => r.original?.request_id_plain)
      .filter(Boolean);

    const idsKey = ids.join('|'); // швидка "deep equals" перевірка

    if (prevIdsKeyRef.current !== idsKey) {
      prevIdsKeyRef.current = idsKey;
      onPageRowIdsChange(ids);
    }
  }, [
    pageIndex,
    rowsPerPage,
    onPageChange,
    onPageRowIdsChange,
    table,
    data, // можна лишити, тепер не зациклить, бо є idsKey guard
  ]);

  useEffect(() => {
    if (rowsPerPage <= 0) return;
    onPageChange?.(table.getState().pagination.pageIndex);
  }, [rowsPerPage, onPageChange, table, table.getState().pagination.pageIndex]);

  const isMobile = useMediaQuery('(max-width:1023px)');
  const visibleColumnsCount = isMobile ? visibleColumnsMobile : visibleColumns;
  const maxIndex = Math.max(columns.length - visibleColumnsCount, 0);

  const handleNextColumn = () =>
    setVisibleColumnIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  const handlePreviousColumn = () =>
    setVisibleColumnIndex(prev => (prev === 0 ? maxIndex : prev - 1));

  const handleHorizontalScroll = direction => {
    if (!scrollContainerRef.current) return;
    const { clientWidth } = scrollContainerRef.current;
    const scrollAmount = clientWidth * 0.7;
    scrollContainerRef.current.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setNeedsHorizontalScroll(scrollWidth > clientWidth);
      }
    
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [data, columns, visibleColumnsCount]);

  // Реальна ширина кожної зафіксованої колонки (не хардкод) — щоб друга
  // (і наступні) прилипала рівно там, де закінчується попередня.
  useLayoutEffect(() => {
    if (fixedCount <= 0) {
      setStickyOffsets([]);
      return;
    }

    const measure = () => {
      const widths = stickyRefs.current
        .slice(0, fixedCount)
        .map(el => el?.offsetWidth || 0);

      const offsets = [];
      let sum = 0;
      for (let i = 0; i < widths.length; i++) {
        offsets.push(sum);
        sum += widths[i];
      }
      setStickyOffsets(offsets);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [fixedCount, data, columns]);

  return (
    <div className={style.mainContainer}>
      {columns.length > visibleColumnsCount &&
        !needsHorizontalScroll &&
        !enableHorizontalScroll && (
          <div
            className={
              visibleColumnsCount !== 1 &&
              (isMobile || styles === 'tableViewTable')
                ? style.btnMobileContainer
                : style.btnAbsoluteContainer
            }
          >
            <button onClick={handlePreviousColumn} className={style.headerBtn}>
              <Icon id="arrow-left" className={style.headerBtnIcon} />
            </button>
            <button onClick={handleNextColumn} className={style.headerBtn}>
              <Icon id="arrow-right" className={style.headerBtnIcon} />
            </button>
          </div>
        )}

      {enableHorizontalScroll && needsHorizontalScroll && (
        <div className={style.btnAbsoluteContainer}>
          <button
            onClick={() => handleHorizontalScroll('left')}
            className={style.headerBtn}
          >
            <Icon id="arrow-left" className={style.headerBtnIcon} />
          </button>
          <button
            onClick={() => handleHorizontalScroll('right')}
            className={style.headerBtn}
          >
            <Icon id="arrow-right" className={style.headerBtnIcon} />
          </button>
        </div>
      )}

      <div className={style.tableContainer} ref={scrollContainerRef}>
        <table className={`${styles ? style[styles] : ''}`}>
          <thead>
            <tr>
              {Array.from({ length: fixedCount }).map((_, i) => (
                <th
                  key={`sticky-header-${i}`}
                  ref={el => (stickyRefs.current[i] = el)}
                  className={style.stickyColumn}
                  style={{ left: stickyOffsets[i] || 0 }}
                >
                  {columns[i]?.header}
                </th>
              ))}
              {columns
                .slice(
                  enableHorizontalScroll && needsHorizontalScroll
                    ? fixedCount
                    : fixedCount > 0
                    ? visibleColumnIndex + fixedCount
                    : visibleColumnIndex,
                  enableHorizontalScroll && needsHorizontalScroll
                    ? columns.length
                    : visibleColumnIndex + visibleColumnsCount
                )
                .map((header, index) => (
                  <th key={index}>{header.header}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const visibleCells =
                enableHorizontalScroll && needsHorizontalScroll
                  ? row.getVisibleCells().slice(fixedCount)
                  : row
                      .getVisibleCells()
                      .slice(
                        fixedCount > 0
                          ? visibleColumnIndex + fixedCount
                          : visibleColumnIndex,
                        visibleColumnIndex + visibleColumnsCount
                      );

              if (isMobile && visibleCells.every(cell => !cell.getValue())) {
                return null;
              }
              return (
                <tr
                  key={row.id}
                  className={style[row.original.className] || ''}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                >
                  {Array.from({ length: fixedCount }).map((_, i) => {
                    const cell = row.getVisibleCells()[i];
                    return (
                      <td
                        key={`sticky-cell-${i}`}
                        className={stickyCellClassName}
                        style={{ left: stickyOffsets[i] || 0 }}
                      >
                        {cell
                          ? flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )
                          : null}
                      </td>
                    );
                  })}
                  {visibleCells.map(cell => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rowsPerPage > 0 && table.getPageCount() > 1 && (
        <div className={style.paginationContainer}>
          <button
            onClick={() => {table.previousPage();}}
            className={style.paginationBtn}
            disabled={!table.getCanPreviousPage()}
          >
            <Icon id="arrow-left-switch" className={style.paginationIcon} />
          </button>
          <span className={style.pageInfo}>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => {table.nextPage();}}
            className={style.paginationBtn}
            disabled={!table.getCanNextPage()}
          >
            <Icon id="arrow-right-switch" className={style.paginationIcon} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Table;
