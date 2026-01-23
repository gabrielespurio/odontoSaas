import fetch from 'node-fetch';
import QRCode from 'qrcode';

const EVOLUTION_API_BASE_URL = 'https://evolutionapi.eduflow.com.br';
const EVOLUTION_API_KEY = 'vyspKHAUPJcGL5RkvdBrdUBGMDmnS6AG';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

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
    // Generate QR code as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    // Remove the "data:image/png;base64," prefix if needed (frontend may add it)
    // Actually keep it since the frontend expects the full data URL
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

    // Clean up the response - remove quotes if it's a JSON string
    let qrCodeText = responseText;
    try {
      const parsed = JSON.parse(responseText);
      if (typeof parsed === 'string') {
        qrCodeText = parsed;
      }
    } catch {
      // Not JSON, use as-is
    }

    // Remove surrounding quotes if present
    qrCodeText = qrCodeText.replace(/^["']|["']$/g, '');
    
    if (!qrCodeText || qrCodeText.length < 50) {
      console.error('QR code text is empty or too short');
      return null;
    }

    console.log(`Converting raw QR text to image (length: ${qrCodeText.length})`);
    
    // Generate QR code image from the text
    const qrCodeImage = await generateQRCodeImage(qrCodeText);
    return qrCodeImage;
  } catch (error) {
    console.error('Error getting Hazapi QR Code:', error);
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

  // Wait longer for the session to fully initialize (3 seconds)
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
    // Generate clean instance name
    const cleanName = companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const instanceName = `odontosync_${companyId}_${cleanName}`;
    
    console.log(`Creating WhatsApp instance: ${instanceName} for company ${companyId}`);
    
    const payload: CreateInstanceRequest = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    };

    console.log('Payload being sent to Evolution API:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${EVOLUTION_API_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    console.log(`Evolution API response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json() as any;
      console.log(`WhatsApp instance created successfully for company ${companyId}:`, instanceName);
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      // Check if QR code is already in the response
      if (data.qrcode?.base64) {
        console.log('QR code found in creation response!');
      } else {
        console.log('QR code not in creation response, waiting 2s and fetching separately...');
        // Wait a bit for instance to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const qrCode = await getInstanceQRCode(instanceName);
        if (qrCode) {
          if (!data.qrcode) {
            data.qrcode = {};
          }
          data.qrcode.base64 = qrCode;
          data.qrcode.code = qrCode;
          console.log('QR code fetched successfully after delay');
        } else {
          console.log('Failed to fetch QR code even after delay');
        }
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.error(`Failed to create WhatsApp instance: ${response.status} - ${errorText}`);
      
      // Try to check if instance already exists
      console.log('Checking if instance already exists...');
      const existingQR = await getInstanceQRCode(instanceName);
      if (existingQR) {
        console.log('Instance exists, returning existing QR code');
        return {
          hash: 'existing',
          qrcode: {
            base64: existingQR,
            code: existingQR
          }
        };
      }
      
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
    console.log(`Getting QR code for instance: ${instanceName}`);
    
    const response = await fetch(`${EVOLUTION_API_BASE_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });

    console.log(`QR code fetch response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json() as any;
      console.log('QR code response data:', JSON.stringify(data, null, 2));
      
      // Check multiple possible locations for the base64 QR code
      if (data.base64) {
        console.log('QR code found in response.base64');
        return data.base64;
      } else if (data.qrcode?.base64) {
        console.log('QR code found in response.qrcode.base64');
        return data.qrcode.base64;
      } else {
        console.log('No QR code in response, available keys:', Object.keys(data));
        
        // Try alternative endpoint for QR code
        const altResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/qrcode/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY
          }
        });
        
        if (altResponse.ok) {
          const altData = await altResponse.json() as any;
          console.log('Alternative QR code response:', JSON.stringify(altData, null, 2));
          return altData.qrcode?.base64 || altData.base64 || null;
        }
        
        return null;
      }
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

// Get instance details (phone number, profile name)
export async function getWhatsAppInstanceDetails(instanceName: string): Promise<{ phoneNumber?: string; profileName?: string } | null> {
  try {
    console.log(`Getting instance details for: ${instanceName}`);
    
    // Try different endpoints to get instance details
    const endpoints = [
      `/instance/fetchInstances`, // Get all instances and find ours
      `/instance/connectionState/${instanceName}`, // Already works, might have more info
      `/chat/whatsappNumbers/${instanceName}`, // Try to get WhatsApp numbers
      `/instance/status/${instanceName}`, // Status endpoint
      `/instance/${instanceName}` // Direct instance endpoint
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(`${EVOLUTION_API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY
          }
        });
        
        console.log(`${endpoint} response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json() as any;
          console.log(`${endpoint} response data:`, JSON.stringify(data, null, 2));
          
          // Handle fetchInstances response
          if (endpoint.includes('fetchInstances') && Array.isArray(data)) {
            console.log(`Found ${data.length} instances in fetchInstances`);
            
            const instance = data.find((inst: any) => 
              inst.name === instanceName ||
              inst.instanceName === instanceName ||
              (inst.instance && inst.instance.instanceName === instanceName)
            );
            
            if (instance) {
              console.log('Found matching instance in fetchInstances:', JSON.stringify(instance, null, 2));
              
              const phoneNumber = instance.ownerJid || instance.wuid || 
                                instance.instance?.wuid || instance.instance?.ownerJid ||
                                instance.instance?.user?.id || instance.user?.id ||
                                instance.owner || instance.instance?.owner;
              const profileName = instance.profileName || instance.instance?.profileName ||
                                instance.instance?.user?.name || instance.user?.name;
              
              if (phoneNumber) {
                return {
                  phoneNumber: phoneNumber.replace('@s.whatsapp.net', '').replace('@c.us', ''),
                  profileName
                };
              }
            } else {
              console.log(`Instance ${instanceName} not found in fetchInstances list`);
              // Log all instance names for debugging
              const instanceNames = data.map(inst => inst.name || inst.instanceName).filter(Boolean);
              console.log('Available instances:', instanceNames);
              
              // As our instance is not in the main list but shows as "open" in connectionState,
              // it might be a newly created instance. Let's return a generic connected status
              // without phone number details for now.
            }
          }
          
          // Handle direct instance data
          if (data.instance || data.wuid || data.owner) {
            const phoneNumber = data.instance?.wuid || data.wuid || 
                              data.instance?.user?.id || data.user?.id ||
                              data.instance?.owner || data.owner;
            const profileName = data.instance?.profileName || data.profileName ||
                              data.instance?.user?.name || data.user?.name;
            
            if (phoneNumber) {
              return {
                phoneNumber: phoneNumber.replace('@s.whatsapp.net', '').replace('@c.us', ''),
                profileName
              };
            }
          }
        }
      } catch (endpointError) {
        console.log(`Endpoint ${endpoint} failed:`, endpointError);
        continue;
      }
    }
    
    console.log(`No valid phone number found for instance ${instanceName}`);
    return null;
  } catch (error) {
    console.error('Error getting instance details:', error);
    return null;
  }
}

// Check instance status
export async function checkInstanceStatus(instanceName: string): Promise<string> {
  try {
    console.log(`Checking status for instance: ${instanceName}`);
    
    // Try different API endpoints for status checking
    const endpoints = [
      `/instance/status/${instanceName}`,
      `/instance/connectionState/${instanceName}`,
      `/instance/fetchInstances`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${EVOLUTION_API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY
          }
        });

        console.log(`Endpoint ${endpoint} response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json() as any;
          console.log(`Response data for ${endpoint}:`, JSON.stringify(data, null, 2));
          
          if (endpoint.includes('fetchInstances')) {
            // Check if our instance exists in the list
            if (Array.isArray(data)) {
              const instance = data.find((inst: any) => inst.instance?.instanceName === instanceName);
              if (instance) {
                console.log(`Found instance in list: ${instance.instance?.state || instance.instance?.status || 'unknown'}`);
                return instance.instance?.state === 'open' ? 'connected' : 'disconnected';
              }
            }
          } else {
            // Direct status check
            const status = data.instance?.status || data.instance?.state;
            if (status) {
              console.log(`Direct status check result: ${status}`);
              return status === 'open' ? 'connected' : 'disconnected';
            }
          }
        }
      } catch (endpointError) {
        console.log(`Endpoint ${endpoint} failed:`, endpointError);
        continue;
      }
    }
    
    console.log(`All endpoints failed for instance ${instanceName}, returning disconnected`);
    return 'disconnected';
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

    const response = await fetch(`${EVOLUTION_API_BASE_URL}/message/sendText`, {
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