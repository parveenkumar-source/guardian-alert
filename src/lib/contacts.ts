export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export const generateSOSMessage = (lat: number, lng: number, name?: string): string => {
  const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
  return `🚨 EMERGENCY SOS ALERT!\n${name ? `From: ${name}\n` : ""}I need immediate help!\n📍 My location: ${mapLink}\nTimestamp: ${new Date().toLocaleString()}`;
};
