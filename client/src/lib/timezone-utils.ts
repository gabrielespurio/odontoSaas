/**
 * Timezone utilities for Brazil (America/Sao_Paulo)
 * Handles timezone conversions and date formatting consistently
 */

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export class TimezoneUtils {
  /**
   * Convert a date to Brazil timezone string for datetime-local input
   */
  static toLocalInputFormat(date: Date): string {
    const brazilDate = new Date(date.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
    const year = brazilDate.getFullYear();
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
    const day = String(brazilDate.getDate()).padStart(2, '0');
    const hours = String(brazilDate.getHours()).padStart(2, '0');
    const minutes = String(brazilDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Convert datetime-local input to proper Date object in Brazil timezone
   */
  static fromLocalInputFormat(dateTimeString: string): Date {
    // Parse the local datetime string and create a Date object
    const localDate = new Date(dateTimeString);
    
    // Convert to Brazil timezone
    const brazilTime = new Date(localDate.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
    
    return brazilTime;
  }

  /**
   * Format date for display in Brazil timezone
   */
  static formatForDisplay(date: Date): string {
    return date.toLocaleString('pt-BR', {
      timeZone: BRAZIL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format time only for display in Brazil timezone
   */
  static formatTimeForDisplay(date: Date): string {
    return date.toLocaleString('pt-BR', {
      timeZone: BRAZIL_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get current date in Brazil timezone
   */
  static getCurrentBrazilTime(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
  }

  /**
   * Check if two dates are on the same day in Brazil timezone
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    const brazil1 = new Date(date1.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
    const brazil2 = new Date(date2.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
    
    return brazil1.getFullYear() === brazil2.getFullYear() &&
           brazil1.getMonth() === brazil2.getMonth() &&
           brazil1.getDate() === brazil2.getDate();
  }

  /**
   * Create a Date object for a specific date and time in Brazil timezone
   */
  static createBrazilDateTime(year: number, month: number, day: number, hour: number, minute: number): Date {
    // Create date string in ISO format for Brazil timezone
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    
    // Parse as local time and adjust for Brazil timezone
    const localDate = new Date(dateString);
    const brazilOffset = -3; // Brazil is UTC-3
    const localOffset = localDate.getTimezoneOffset() / 60;
    const adjustment = (brazilOffset - localOffset) * 60 * 60 * 1000;
    
    return new Date(localDate.getTime() + adjustment);
  }

  /**
   * Convert server UTC timestamp to Brazil timezone
   */
  static fromServerTimestamp(timestamp: string): Date {
    const utcDate = new Date(timestamp);
    return new Date(utcDate.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
  }

  /**
   * Convert Brazil timezone date to server UTC format
   */
  static toServerTimestamp(date: Date): string {
    // Adjust for Brazil timezone offset
    const brazilOffset = -3; // UTC-3
    const utcTime = date.getTime() - (brazilOffset * 60 * 60 * 1000);
    return new Date(utcTime).toISOString();
  }
}