import cron from 'node-cron';
import { storage } from './storage';
import { sendWhatsAppMessage } from './whatsapp';

// Function to format reminder message
function formatReminderMessage(patientName: string, appointmentTime: string): string {
  return `Olá ${patientName}, passando para lembrar que você tem uma consulta marcada para amanhã às ${appointmentTime}.`;
}

// Function to get tomorrow's date in Brazil timezone
function getTomorrowDate(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Format as YYYY-MM-DD for database comparison
  return tomorrow.toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo'
  });
}

// Function to send reminder for a specific appointment
async function sendAppointmentReminder(appointment: any): Promise<void> {
  try {
    if (!appointment.patient?.phone) {
      console.log(`No phone number for patient ${appointment.patient?.name} (appointment ${appointment.id})`);
      return;
    }

    // Format appointment time in Brazil timezone
    const appointmentDate = new Date(appointment.scheduledDate);
    const appointmentTime = appointmentDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });

    const message = formatReminderMessage(appointment.patient.name, appointmentTime);
    
    const success = await sendWhatsAppMessage(appointment.patient.phone, message);
    
    if (success) {
      console.log(`Reminder sent successfully to ${appointment.patient.name} for appointment ${appointment.id}`);
    } else {
      console.log(`Failed to send reminder to ${appointment.patient.name} for appointment ${appointment.id}`);
    }
  } catch (error) {
    console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
  }
}

// Function to check and send all reminders for tomorrow
async function sendDailyReminders(): Promise<void> {
  try {
    console.log('Starting daily reminder check...');
    
    const tomorrowDate = getTomorrowDate();
    console.log(`Checking appointments for date: ${tomorrowDate}`);
    
    // Get all appointments for tomorrow
    const allAppointments = await storage.getAppointments();
    
    // Filter appointments for tomorrow that are scheduled or confirmed
    const tomorrowAppointments = allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.scheduledDate);
      const appointmentDateString = appointmentDate.toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo'
      });
      
      return appointmentDateString === tomorrowDate && 
             (appointment.status === 'agendado' || appointment.status === 'confirmed');
    });

    console.log(`Found ${tomorrowAppointments.length} appointments for tomorrow`);

    // Send reminder for each appointment
    for (const appointment of tomorrowAppointments) {
      await sendAppointmentReminder(appointment);
      // Add small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Daily reminder check completed');
  } catch (error) {
    console.error('Error in daily reminder check:', error);
  }
}

// Initialize the scheduler
export function initializeScheduler(): void {
  console.log('Initializing reminder scheduler...');
  
  // Schedule task to run every day at 8:00 AM Brazil time
  // Using timezone option to ensure it runs at Brazil time
  cron.schedule('0 8 * * *', sendDailyReminders, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });
  
  console.log('Reminder scheduler initialized - will run daily at 8:00 AM Brazil time');
}

// Export function for manual testing
export { sendDailyReminders };