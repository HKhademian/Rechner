import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";

/** Column text alignment for institutional financial tables. */
export const DataColumnAlign = {
  Left: "left",
  Right: "right",
} as const;
export type DataColumnAlign = (typeof DataColumnAlign)[keyof typeof DataColumnAlign];

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: ComponentChildren;
  readonly align?: DataColumnAlign;
  readonly render: (row: T) => ComponentChildren;
}

export interface DataTableProps<T> {
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T, index: number) => string;
  readonly isTotalRow?: (row: T) => boolean;
  readonly caption?: string;
  readonly compact?: boolean;
  readonly stickyHeader?: boolean;
  readonly className?: string;
}

/**
 * Shared institutional data table with responsive horizontal scrolling, right-aligned
 * tabular numerals, and standardized total row hierarchy.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isTotalRow,
  caption,
  compact = false,
  stickyHeader = false,
  className = "",
}: DataTableProps<T>): JSX.Element {
  const tableClasses = [
    "ui-table",
    compact ? "ui-table--compact" : "",
    stickyHeader ? "ui-table--sticky" : "",
    className.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ui-table-wrap">
      <table className={tableClasses}>
        {caption && <caption className="ui-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === DataColumnAlign.Right ? "ui-table__num" : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} className={isTotalRow?.(row) ? "is-total" : undefined}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.align === DataColumnAlign.Right ? "ui-table__num tabular-nums" : undefined}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
