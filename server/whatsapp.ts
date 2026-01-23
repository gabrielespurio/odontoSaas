import fetch from 'node-fetch';
import QRCode from 'qrcode';

// Hazapi WhatsApp API Configuration
const HAZAPI_BASE_URL = 'https://gestaoapi.hazapi.com.br/v2/api/external/048fcb78-ff39-4365-9388-d1e6e72efdea';
const HAZAPI_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6NiwicHJvZmlsZSI6ImFkbWluIiwic2Vzc2lvbklkIjoyMCwiaWF0IjoxNzY5MTI5MzEzLCJleHAiOjE4MzIyMDEzMTN9.gdTRyuogzqUc1y1gtRoQBQ4S_1bHCwY8PFtK18WQuJU';
const HAZAPI_WHATSAPP_ID = 20;

export interface HazapiStartSessionResponse {
  message?: string;
  error?: string;
}

export interface HazapiQRCodeResponse {
  qrcode?: string;
  base64?: string;
  error?: string;
}

export interface HazapiChannelInfo {
  id: number;
  name: string;
  status: string;
  number: string;
  phone?: {
    id: string;
    lid: string;
  };
  profilePic?: string;
  isActive: boolean;
  qrcode?: string;
}

// Start WhatsApp session using Hazapi API
export async function startHazapiSession(whatsappId: number = HAZAPI_WHATSAPP_ID): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Starting Hazapi WhatsApp session with ID: ${whatsappId}`);
    
    const response = await fetch(`${HAZAPI_BASE_URL}/startSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HAZAPI_AUTH_TOKEN}`
      },
      body: JSON.stringify({ whatsappId })
    });

    const responseText = await response.text();
    console.log(`Hazapi startSession response: ${responseText}`);

    if (responseText.includes(`Whatsapp started: ${whatsappId}`)) {
      return { success: true, message: responseText };
    }
    
    return { success: false, message: responseText };
  } catch (error) {
    console.error('Error starting Hazapi session:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Convert raw QR code text to base64 image
async function generateQRCodeImage(text: string): Promise<string | null> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    console.log('QR code image generated successfully');
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code image:', error);
    return null;
  }
}

// Get QR Code from Hazapi API
export async function getHazapiQRCode(whatsappId: number = HAZAPI_WHATSAPP_ID): Promise<string | null> {
  try {
    console.log(`Getting Hazapi QR Code for WhatsApp ID: ${whatsappId}`);
    
    const response = await fetch(`${HAZAPI_BASE_URL}/qrCodeSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HAZAPI_AUTH_TOKEN}`
      },
      body: JSON.stringify({ whatsappId })
    });

    const responseText = await response.text();
    console.log(`Hazapi qrCodeSession raw response (status ${response.status}):`, responseText.substring(0, 200));

    if (!response.ok) {
      console.error(`Hazapi qrCodeSession error: ${response.status}`);
      return null;
    }

    let qrCodeText = responseText;
    try {
      const parsed = JSON.parse(responseText);
      if (typeof parsed === 'string') {
        qrCodeText = parsed;
      }
    } catch {
      // Not JSON, use as-is
    }

    qrCodeText = qrCodeText.replace(/^["']|["']$/g, '');
    
    if (!qrCodeText || qrCodeText.length < 50) {
      console.error('QR code text is empty or too short');
      return null;
    }

    console.log(`Converting raw QR text to image (length: ${qrCodeText.length})`);
    
    const qrCodeImage = await generateQRCodeImage(qrCodeText);
    return qrCodeImage;
  } catch (error) {
    console.error('Error getting Hazapi QR Code:', error);
    return null;
  }
}

// Check WhatsApp channel status using Hazapi API
export async function getHazapiChannelStatus(whatsappId: number = HAZAPI_WHATSAPP_ID): Promise<HazapiChannelInfo | null> {
  try {
    console.log(`Getting Hazapi channel status for ID: ${whatsappId}`);
    
    const response = await fetch(`${HAZAPI_BASE_URL}/showChannelById`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HAZAPI_AUTH_TOKEN}`
      },
      body: JSON.stringify({ id: whatsappId })
    });

    if (!response.ok) {
      console.error(`Hazapi showChannelById error: ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    console.log(`Hazapi channel status response:`, JSON.stringify({
      id: data.id,
      name: data.name,
      status: data.status,
      number: data.number,
      isActive: data.isActive
    }));

    // Extract phone number from phone object if available
    let phoneNumber = data.number || '';
    if (data.phone?.id) {
      phoneNumber = data.phone.id.split(':')[0].replace('@s.whatsapp.net', '');
    }

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      number: phoneNumber,
      phone: data.phone,
      profilePic: data.profilePic,
      isActive: data.isActive,
      qrcode: data.qrcode
    };
  } catch (error) {
    console.error('Error getting Hazapi channel status:', error);
    return null;
  }
}

// Setup WhatsApp using Hazapi API (start session + get QR code)
export async function setupHazapiWhatsApp(whatsappId: number = HAZAPI_WHATSAPP_ID): Promise<{ success: boolean; qrCode?: string; message: string }> {
  // Step 1: Start session
  console.log('Step 1: Starting Hazapi session...');
  const startResult = await startHazapiSession(whatsappId);
  
  if (!startResult.success) {
    return { success: false, message: `Failed to start session: ${startResult.message}` };
  }
  
  console.log('Session started successfully, waiting for initialization...');

  // Wait for the session to fully initialize (3 seconds)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 2: Get QR Code with retry
  console.log('Step 2: Getting QR code...');
  let qrCode = await getHazapiQRCode(whatsappId);
  
  // If first attempt fails, wait and retry once
  if (!qrCode) {
    console.log('First QR code attempt failed, waiting and retrying...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    qrCode = await getHazapiQRCode(whatsappId);
  }
  
  if (!qrCode) {
    return { success: false, message: 'Session started but failed to get QR code after retries' };
  }

  console.log('QR code obtained successfully');
  return { success: true, qrCode, message: 'WhatsApp session started successfully' };
}

export interface WhatsAppMessage {
  number: string;
  text: string;
}

// Send WhatsApp message using Hazapi API
export async function sendHazapiMessage(phoneNumber: string, message: string, whatsappId: number = HAZAPI_WHATSAPP_ID): Promise<boolean> {
  try {
    // Format phone number
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = `55${formattedNumber}`;
    }

    console.log(`Sending Hazapi message to ${formattedNumber}`);

    const response = await fetch(`${HAZAPI_BASE_URL}/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HAZAPI_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        whatsappId,
        number: formattedNumber,
        text: message
      })
    });

    const responseText = await response.text();
    console.log(`Hazapi sendText response (status ${response.status}):`, responseText.substring(0, 200));

    if (response.ok) {
      console.log(`WhatsApp message sent successfully via Hazapi to ${formattedNumber}`);
      return true;
    } else {
      console.error(`Failed to send WhatsApp message via Hazapi: ${response.status} - ${responseText}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending WhatsApp message via Hazapi:', error);
    return false;
  }
}

// Send message using company's WhatsApp (uses Hazapi)
export async function sendWhatsAppMessageByCompany(instanceName: string, phoneNumber: string, message: string): Promise<boolean> {
  // Use Hazapi API for all messages
  return sendHazapiMessage(phoneNumber, message);
}

// Legacy function for backward compatibility
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  return sendHazapiMessage(phoneNumber, message);
}

export function formatAppointmentMessage(patientName: string, appointmentDate: Date): string {
  const year = appointmentDate.getFullYear();
  const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
  const day = String(appointmentDate.getDate()).padStart(2, '0');
  const hours = String(appointmentDate.getHours()).padStart(2, '0');
  const minutes = String(appointmentDate.getMinutes()).padStart(2, '0');
  
  const formattedDate = `${day}/${month}/${year}`;
  const formattedTime = `${hours}:${minutes}`;

  return `Olá ${patientName}, sua consulta está marcada para o dia ${formattedDate} às ${formattedTime}.`;
}
