import { generateTimeLabels } from "../lib/timetable";
import { ICellContent, ITimetableEntry } from "../interfaces/timetable";

export const dayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export const defaultBlockedTexts = [
  "break",
  "short break",
  "devotion",
  "assembly",
  "lunch",
  "recess",
  "morning devotion",
  "closing",
  "games",
  "sports",
  "free period",
];

export const extractTimetableData = (
  cellContents: Map<string, ICellContent>,
  hiddenCells: Set<string>,
  columnCount: number,
  columnDurations: { [key: number]: number },
  defaultSlotDuration: number,
  mergedCells?: Map<string, any>,
): ITimetableEntry[] => {
  const timeLabels = generateTimeLabels(
    columnCount,
    columnDurations,
    defaultSlotDuration,
  );
  const entries: ITimetableEntry[] = [];

  for (let row = 0; row < 5; row++) {
    // 5 days
    for (let col = 0; col < columnCount; col++) {
      const cellKey = `${row}-${col}`;

      // Skip hidden cells (part of merged cells)
      if (hiddenCells.has(cellKey)) continue;

      const cellContent = cellContents.get(cellKey);
      const _mergeInfo = mergedCells?.get(cellKey);
      console.log(_mergeInfo);

      const entry: ITimetableEntry = {
        cellKey,
        row,
        col,
        day: dayLabels[row],
        timeSlot: timeLabels[col],
        customText: cellContent?.text,
        // Store cell formatting properties
        isVertical: cellContent?.isVertical,
        alignment: cellContent?.alignment,
      };

      entries.push(entry);
    }
  }

  return entries;
};
