// Utility functions for consistent date formatting in Brazil timezone

export function formatDateForDatabase(dateString: string): Date {
  // Input: "2025-07-18T09:00" (local Brazil time from form)
  // Output: Date object that represents the exact time in Brazil
  
  if (!dateString) return new Date();
  
  // Parse the input as Brazil local time
  // Create a date object treating the input as Brazil timezone
  const [datePart, timePart] = dateString.includes('T') 
    ? dateString.split('T') 
    : dateString.split(' ');
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  // Create date in Brazil timezone (GMT-3)
  // We create the date with exact values without timezone conversion
  const brazilDate = new Date();
  brazilDate.setFullYear(year);
  brazilDate.setMonth(month - 1); // Month is 0-indexed
  brazilDate.setDate(day);
  brazilDate.setHours(hour);
  brazilDate.setMinutes(minute);
  brazilDate.setSeconds(0);
  brazilDate.setMilliseconds(0);
  
  return brazilDate;
}

export function formatDateForFrontend(date: Date | string): string {
  // Always return in ISO format without timezone conversion
  if (typeof date === 'string') {
    // Remove any timezone indicators (including milliseconds with Z)
    const cleanDate = date
      .replace(/\.\d{3}Z$/, '') // Remove .000Z
      .replace(/Z$/, '') // Remove Z
      .replace(/[+-]\d{2}:\d{2}$/, ''); // Remove timezone offset
    
    // If it's already a string, ensure it's in the right format
    if (cleanDate.includes(' ')) {
      // Convert "YYYY-MM-DD HH:MM:SS" to "YYYY-MM-DDTHH:MM:SS"
      const [datePart, timePart] = cleanDate.split(' ');
      // Ensure time has seconds
      const timeComponents = timePart.split(':');
      const formattedTime = timeComponents.length === 2 
        ? `${timePart}:00` 
        : timePart;
      return `${datePart}T${formattedTime}`;
    }
    
    // If it's in ISO format, just clean it up
    if (cleanDate.includes('T')) {
      const [datePart, timePart] = cleanDate.split('T');
      // Ensure time has seconds
      const timeComponents = timePart.split(':');
      const formattedTime = timeComponents.length === 2 
        ? `${timePart}:00` 
        : timePart.substring(0, 8); // Take only HH:MM:SS
      return `${datePart}T${formattedTime}`;
    }
    
    return cleanDate;
  }
  
  // If it's a Date object, format it
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function parseBrazilTime(dateString: string): Date {
  // Parse a date string as Brazil local time
  if (!dateString) return new Date();
  
  // Remove any timezone indicators
  const cleanDateString = dateString.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '');
  
  // Parse as local time
  if (cleanDateString.includes('T')) {
    const [datePart, timePart] = cleanDateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second = 0] = timePart.split(':').map(Number);
    
    return new Date(year, month - 1, day, hour, minute, second);
  }
  
  if (cleanDateString.includes(' ')) {
    const [datePart, timePart] = cleanDateString.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second = 0] = timePart.split(':').map(Number);
    
    return new Date(year, month - 1, day, hour, minute, second);
  }
  
  return new Date(cleanDateString);
}