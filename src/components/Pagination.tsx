'use client';

import { useState, useMemo } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface PaginationProps {
  totalItems: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number, pageSize: number) => void;
}

export interface PaginationResult<T> {
  paginatedData: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
}

export function usePagination<T>(
  data: T[],
  defaultPageSize: number = 10
): PaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const safePage = Math.min(page, totalPages);
  const safeSetPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    paginatedData,
    pagination: {
      page: safePage,
      pageSize,
      totalPages,
      totalItems: data.length,
      setPage: safeSetPage,
      setPageSize: handleSetPageSize,
    },
  };
}

export default function Pagination({
  totalItems,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps & { page?: number; pageSize?: number; totalPages?: number; setPage?: (p: number) => void; setPageSize?: (s: number) => void }) {
  return null;
}

export function PaginationControls({
  page,
  pageSize,
  totalPages,
  totalItems,
  setPage,
  setPageSize,
  pageSizeOptions = [10, 25, 50, 100],
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  pageSizeOptions?: number[];
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages = useMemo(() => {
    const result: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (page > 3) result.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        result.push(i);
      }
      if (page < totalPages - 2) result.push('...');
      result.push(totalPages);
    }
    return result;
  }, [page, totalPages]);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0]">
      <div className="flex items-center gap-2 text-sm text-[#64748B]">
        <span>
          Showing {start}–{end} of {totalItems}
        </span>
        <span className="mx-1">·</span>
        <label className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-[#D1D5DB] rounded-md px-2 py-1 text-sm bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF]"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-sm text-[#94A3B8]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-[#1E40AF] text-white'
                  : 'text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
