/* eslint-disable @next/next/no-img-element */
import React from "react";

interface CustomPaginationProps {
  className?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  className,
  currentPage = 1,
  totalPages = 5,
  onPageChange,
}) => {
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && onPageChange) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <ul className={`pagination_list ${className || ""}`}>
      <li
        className={`arrow prev_arrow ${currentPage === 1 ? "disabled" : ""}`}
        onClick={() => handlePageChange(currentPage - 1)}
        style={{ cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
      >
        <img src="/images/left_arrow.svg" alt="icon" />
      </li>
      {getPageNumbers().map((page, index) => (
        <li
          key={index}
          className={page === currentPage ? "active" : ""}
          onClick={() => typeof page === "number" && handlePageChange(page)}
          style={{ cursor: typeof page === "number" ? "pointer" : "default" }}
        >
          {page}
        </li>
      ))}
      <li
        className={`next_arrow arrow ${currentPage === totalPages ? "disabled" : ""}`}
        onClick={() => handlePageChange(currentPage + 1)}
        style={{ cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
      >
        <img src="/images/left_arrow.svg" alt="icon" />
      </li>
    </ul>
  );
};

export default CustomPagination;
