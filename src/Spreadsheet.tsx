import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NonEditableCell, ReactGrid, TextCell } from "@silevis/reactgrid";
import type { Cell } from "@silevis/reactgrid";
import { useFieldArray, UseFormReturn, useForm } from 'react-hook-form';

// Types
type CellTemplate = typeof TextCell | typeof NonEditableCell;

interface CustomCell extends Omit<Cell, "rowIndex" | "colIndex" | "Template"> {
    title?: string;
    template?: typeof TextCell | typeof NonEditableCell;
    props?: Record<string, any>;
}

interface HeaderInfo<T extends Record<string, any>> {
    key: keyof T;
    cell: Cell | null;
    title: string;
    customCell: CustomCell | null;
    colSpan?: number;
}

const DISABLED_COLOR = "#EEEEEE"

interface SpreadsheetProps<T extends Record<string, any>> {
    /**
     * Data to be displayed in the grid
     */
    data: T[];

    /**
     * Optional function to customize column headers and their cells.
     * @param key - The key from the data object
     * @param rowIndex - Current row index (0 for header)
     * @param colIndex - Current column index (shifted by 1 for row numbers)
     * @returns 
     * - string: Creates a default header cell with this text
     * - null: Hides this column
     * - CustomCell: Uses custom settings for header and column cells
     */
    columnHeaderTitle?: (key: keyof T, rowIndex: number, colIndex: number) => string | null | CustomCell;

    /**
     * Height of the grid container
     */
    height?: string;

    /**
     * Width of the grid container
     */
    width?: string;

    /**
     * Number of rows to stick to the top
     */
    stickyTopRows?: number;

    /**
     * Number of rows to stick to the bottom
     */
    stickyBottomRows?: number;

    /**
     * Number of columns to stick to the left
     */
    stickyLeftColumns?: number;

    /**
     * Number of columns to stick to the right
     */
    stickyRightColumns?: number;

    form?: UseFormReturn<any>;  // Optional form prop
    fieldArrayName?: string;    // Optional field array name if form is provided
}

// Cell Factories
const createTextCell = (text: string, nonEditable = false): Cell => ({
    rowIndex: 0,
    colIndex: 0,
    Template: TextCell,
    props: {
        text: String(text),
        nonEditable
    }
});

// const createNumberCell = (value: number, nonEditable = false): Cell => ({
//     rowIndex: 0,
//     colIndex: 0,
//     Template: TextCell,
//     props: {
//         value,
//         nonEditable
//     }
// });

const createHeaderCell = (value: string): Cell => ({
    rowIndex: 0,
    colIndex: 0,
    Template: NonEditableCell,
    props: {
        value,
        nonEditable: true,
        style: {
            backgroundColor: DISABLED_COLOR
        } as React.CSSProperties
    }
});

const createRowNumberCell = (value: number): Cell => ({
    rowIndex: 0,
    colIndex: 0,
    Template: NonEditableCell,
    props: {
        value: String(value),
        nonEditable: true,
        style: {
            backgroundColor: DISABLED_COLOR
        } as React.CSSProperties
    }
});

// Utility Functions
function getObjectKeys<T extends Record<string, any>>(obj: T): Array<keyof T> {
    // Filter out the 'id' field added by useFieldArray
    return Object.keys(obj).filter(key => key !== 'id') as Array<keyof T>;
}

function processHeaderInfo<T extends Record<string, any>>(
    key: keyof T, 
    colIdx: number, 
    columnHeaderTitle?: SpreadsheetProps<T>['columnHeaderTitle']
): HeaderInfo<T> | null {
    if (!columnHeaderTitle) {
        return {
            key,
            cell: createHeaderCell(String(key)),
            title: String(key),
            customCell: null
        };
    }

    const result = columnHeaderTitle(key, 0, colIdx + 1);
    
    if (result === null) return null;
    
    if (typeof result === 'string') {
        return {
            key,
            cell: createHeaderCell(result),
            title: result,
            customCell: null
        };
    }

    const template = result.template || NonEditableCell;
    const cell: Cell = {
        rowIndex: 0,
        colIndex: colIdx + 1,
        Template: template,
        props: result.props || { value: result.title || String(key), nonEditable: true, style: { backgroundColor: DISABLED_COLOR} },
        rowSpan: result.rowSpan,
        colSpan: result.colSpan,
        isFocusable: result.isFocusable,
        isSelectable: result.isSelectable
    };

    return {
        key,
        cell,
        title: result.title || String(key),
        customCell: result,
        colSpan: result.colSpan
    };
}

function createDataCell(
    value: any, 
    rowIdx: number, 
    colIdx: number, 
    customCell: CustomCell | null
): Cell {
    // const baseCell = typeof value === 'number'
    //     ? createNumberCell(value)
    //     : createTextCell(String(value || ''));
    const baseCell = createTextCell(String(value || ''));

    if (customCell) {
        const template = customCell.template || TextCell;
        return {
            ...baseCell,
            rowIndex: rowIdx,
            colIndex: colIdx,
            Template: template,
            props: {
                ...baseCell.props,
                ...customCell.props
            },
            rowSpan: customCell.rowSpan,
            colSpan: customCell.colSpan,
            isFocusable: customCell.isFocusable,
            isSelectable: customCell.isSelectable
        };
    }

    return {
        ...baseCell,
        rowIndex: rowIdx,
        colIndex: colIdx
    };
}

export function Spreadsheet<T extends Record<string, any>>({
    data: initialData,
    columnHeaderTitle,
    height = "400px",
    width = "100%",
    stickyTopRows = 1,
    stickyBottomRows = 0,
    stickyLeftColumns = 1,
    stickyRightColumns = 0,
    form,
    fieldArrayName = "items"
}: SpreadsheetProps<T>) {
    // If form is provided, use its control, otherwise create internal form state
    const { control } = form || useForm({
        defaultValues: {
            [fieldArrayName]: initialData
        }
    });

    // Use fieldArray either connected to parent form or internal state
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: fieldArrayName
    });

    // Use fields as the source of truth for rendering
    const data = fields as T[];

    const getCells = useCallback((): Cell[] => {
        if (data.length === 0) return [];

        // Get all keys from the first item, excluding 'id'
        const firstItem = data[0];
        const allKeys = getObjectKeys(firstItem);

        // Process header information and filter out null results
        const headerInfo = allKeys
            .map((key, colIdx) => processHeaderInfo(key, colIdx, columnHeaderTitle))
            .filter((info): info is HeaderInfo<T> => info !== null);

        // Create row number header cell
        const rowNumberHeaderCell: Cell = {
            ...createHeaderCell("#"),
            rowIndex: 0,
            colIndex: 0
        };

        // Create row number cells
        const rowNumberCells: Cell[] = data.map((_, idx) => ({
            ...createRowNumberCell(idx + 1),
            rowIndex: idx + 1,
            colIndex: 0
        }));

        // Calculate column positions considering colSpan
        let currentColIndex = 1; // Start after row numbers
        const headerCells: Cell[] = [];
        const columnPositions = new Map<keyof T, number>();

        headerInfo.forEach((info) => {
            // Store the column position for data cells
            columnPositions.set(info.key, currentColIndex);

            // Create header cell with correct position
            headerCells.push({
                ...(info.cell || createHeaderCell(String(info.key))),
                rowIndex: 0,
                colIndex: currentColIndex,
                Template: info.cell?.Template || NonEditableCell
            });

            // Increment column index by colSpan or 1
            currentColIndex += (info.colSpan || 1);
        });

        // Create data cells using stored column positions
        const dataCells: Cell[] = data.flatMap((item, rowIdx) =>
            headerInfo.map((info) => {
                const colIdx = columnPositions.get(info.key)!;
                return createDataCell(
                    item[info.key],
                    rowIdx + 1,
                    colIdx,
                    info.customCell
                );
            })
        );

        return [rowNumberHeaderCell, ...rowNumberCells, ...headerCells, ...dataCells];
    }, [data, columnHeaderTitle]);

    const memoizedCells = useMemo(() => getCells(), [getCells]);

    return (
        <div className='w-full h-full overflow-scroll'>

        <div style={{ height, width }}>
            <ReactGrid
                cells={memoizedCells}
                stickyTopRows={stickyTopRows}
                stickyBottomRows={stickyBottomRows}
                stickyLeftColumns={stickyLeftColumns}
                stickyRightColumns={stickyRightColumns}
            />
        </div>
        </div>
    );
}

export default Spreadsheet; 