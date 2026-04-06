export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export const generateSOSMessage = (lat: number, lng: number, name?: string): string => {
  const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
  const time = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return [
    `🚨 *EMERGENCY SOS ALERT!*`,
    ``,
    name ? `👤 *Name:* ${name}` : "",
    `⚠️ I am in danger and need immediate help!`,
    ``,
    `📍 *Live Location:*`,
    `${mapLink}`,
    ``,
    `🕐 *Time:* ${time}`,
    ``,
    `Please call me or send help immediately.`,
    `This is an automated alert from Raksha Safety App.`,
  ]
    .filter(Boolean)
    .join("\n");
};
