import type { HTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className = "", children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="ui-table-wrap">
      <table className={`ui-table ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`ui-table-head ${className}`.trim()} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`ui-table-body ${className}`.trim()} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  highlight = false,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { highlight?: boolean }) {
  return (
    <tr className={`ui-table-row ${highlight ? "is-highlight" : ""} ${className}`.trim()} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ className = "", children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`ui-table-th ${className}`.trim()} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className = "", children, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={`ui-table-td ${className}`.trim()} {...props}>
      {children}
    </td>
  );
}
