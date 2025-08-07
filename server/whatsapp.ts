import fetch from 'node-fetch';

const EVOLUTION_API_BASE_URL = 'https://evolutionapi.eduflow.com.br';
const EVOLUTION_API_KEY = 'vyspKHAUPJcGL5RkvdBrdUBGMDmnS6AG';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

export interface WhatsAppMessage {
  number: string;
  text: string;
}

export interface EvolutionAPIResponse {
  hash?: string;
  qrcode?: {
    base64: string;
    code: string;
  };
  instance?: {
    instanceName: string;
    status: string;
  };
}

export interface CreateInstanceRequest {
  instanceName: string;
  qrcode: boolean;
  integration: string;
}

// Create WhatsApp instance for a company
export async function createWhatsAppInstance(companyId: number, companyName: string): Promise<EvolutionAPIResponse | null> {
  try {
    const instanceName = `company_${companyId}_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    const payload: CreateInstanceRequest = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    };

    const response = await fetch(`${EVOLUTION_API_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json() as EvolutionAPIResponse;
      console.log(`WhatsApp instance created successfully for company ${companyId}:`, instanceName);
      return data;
    } else {
      const errorText = await response.text();
      console.error(`Failed to create WhatsApp instance: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error('Error creating WhatsApp instance:', error);
    return null;
  }
}

// Get QR code for instance
export async function getInstanceQRCode(instanceName: string): Promise<string | null> {
  try {
    const response = await fetch(`${EVOLUTION_API_BASE_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });

    if (response.ok) {
      const data = await response.json() as EvolutionAPIResponse;
      return data.qrcode?.base64 || null;
    } else {
      const errorText = await response.text();
      console.error(`Failed to get QR code: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error('Error getting QR code:', error);
    return null;
  }
}

// Check instance status
export async function checkInstanceStatus(instanceName: string): Promise<string> {
  try {
    const response = await fetch(`${EVOLUTION_API_BASE_URL}/instance/status/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });

    if (response.ok) {
      const data = await response.json() as EvolutionAPIResponse;
      return data.instance?.status || 'disconnected';
    } else {
      console.error(`Failed to check instance status: ${response.status}`);
      return 'disconnected';
    }
  } catch (error) {
    console.error('Error checking instance status:', error);
    return 'disconnected';
  }
}

// Send message using company's instance
export async function sendWhatsAppMessageByCompany(instanceName: string, phoneNumber: string, message: string): Promise<boolean> {
  try {
    // Format phone number
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = `55${formattedNumber}`;
    }

    const payload = {
      number: formattedNumber,
      text: message
    };

    const response = await fetch(`${EVOLUTION_API_BASE_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`WhatsApp message sent successfully via ${instanceName} to ${formattedNumber}`);
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

// Legacy function for backward compatibility
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