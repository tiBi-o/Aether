export interface CalendarEvent {
    date: string;
    title: string;
}
export interface PDFExportOptions {
    year: number;
    selectedMonths: string[];
    events: CalendarEvent[];
    backgroundUrl?: string;
}
export declare function exportCalendarToPDF({ year, selectedMonths, events, backgroundUrl, }: PDFExportOptions): Promise<Uint8Array<ArrayBufferLike>>;
