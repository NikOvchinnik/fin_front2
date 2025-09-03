import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import style from './Table.module.css';
import { useState, useRef, useEffect } from 'react';
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
}) => {
  const [visibleColumnIndex, setVisibleColumnIndex] = useState(0);
  const [needsHorizontalScroll, setNeedsHorizontalScroll] = useState(false);
  const scrollContainerRef = useRef(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
              {fixedFirstColumn && (
                <th className={style.stickyColumn}>{columns[0].header}</th>
              )}
              {columns
                .slice(
                  enableHorizontalScroll && needsHorizontalScroll
                    ? 0 
                    : fixedFirstColumn
                    ? visibleColumnIndex + 1
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
                  ? row.getVisibleCells()
                  : row
                      .getVisibleCells()
                      .slice(
                        fixedFirstColumn
                          ? visibleColumnIndex + 1
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
                >
                  {fixedFirstColumn && (
                    <td className={style.stickyColumn}>
                      {row.getVisibleCells()[0]?.renderValue()}
                    </td>
                  )}
                  {visibleCells.map(cell => (
                    <td key={cell.id}>{cell.renderValue()}</td>
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
            onClick={() => table.previousPage()}
            className={style.paginationBtn}
            disabled={!table.getCanPreviousPage()}
          >
            <Icon id="arrow-left-switch" className={style.paginationIcon} />
          </button>
          <span className={style.pageInfo}>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
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
