// Utility functions for handling Brazil timezone (America/Sao_Paulo GMT-3)

export class BrazilTimezone {
  // Convert a date string "YYYY-MM-DDTHH:MM" to a Date object in Brazil timezone
  static parseLocalDateTime(dateTimeStr: string): Date {
    if (typeof dateTimeStr === 'string' && dateTimeStr.length === 16) {
      // Format: "YYYY-MM-DDTHH:MM"
      const [dateStr, timeStr] = dateTimeStr.split('T');
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      
      // Create date in local timezone (Brazil)
      const date = new Date(year, month - 1, day, hour, minute, 0, 0);
      return date;
    }
    
    // If it's already a Date or ISO string, return as Date
    return new Date(dateTimeStr);
  }
  
  // Format a Date object to Brazil timezone string
  static formatToBrazilTime(date: Date): string {
    // Get Brazil timezone offset (-3 hours from UTC)
    const brazilOffset = -3 * 60; // in minutes
    const localOffset = date.getTimezoneOffset(); // in minutes
    const offsetDiff = brazilOffset - localOffset;
    
    // Adjust the date to Brazil timezone
    const brazilDate = new Date(date.getTime() + offsetDiff * 60 * 1000);
    
    const year = brazilDate.getFullYear();
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
    const day = String(brazilDate.getDate()).padStart(2, '0');
    const hour = String(brazilDate.getHours()).padStart(2, '0');
    const minute = String(brazilDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
  
  // Keep date in Brazil timezone without conversion
  static keepBrazilTime(dateTimeStr: string): Date {
    if (typeof dateTimeStr === 'string' && dateTimeStr.length === 16) {
      return this.parseLocalDateTime(dateTimeStr);
    }
    return new Date(dateTimeStr);
  }
}