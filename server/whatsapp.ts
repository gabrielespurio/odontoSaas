import fetch from 'node-fetch';

const WHATSAPP_API_URL = 'https://evolutionapi.eduflow.com.br/message/sendText/havr';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

export interface WhatsAppMessage {
  number: string;
  text: string;
}

export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    if (!WHATSAPP_API_KEY) {
      console.error('WHATSAPP_API_KEY not found in environment variables');
      return false;
    }

    // Format phone number - ensure it starts with 55 (Brazil country code)
    let formattedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    
    // If number doesn't start with 55, add it
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = `55${formattedNumber}`;
    }

    const payload: WhatsAppMessage = {
      number: formattedNumber,
      text: message
    };

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`WhatsApp message sent successfully to ${formattedNumber}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`Failed to send WhatsApp message: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

export function formatAppointmentMessage(patientName: string, appointmentDate: Date): string {
  // Create a new date assuming the stored date is already in Brazil timezone
  // but we need to display it correctly without timezone conversion
  
  const year = appointmentDate.getFullYear();
  const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
  const day = String(appointmentDate.getDate()).padStart(2, '0');
  const hours = String(appointmentDate.getHours()).padStart(2, '0');
  const minutes = String(appointmentDate.getMinutes()).padStart(2, '0');
  
  const formattedDate = `${day}/${month}/${year}`;
  const formattedTime = `${hours}:${minutes}`;

  return `Olá ${patientName}, sua consulta está marcada para o dia ${formattedDate} às ${formattedTime}.`;
}