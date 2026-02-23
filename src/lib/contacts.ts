export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const STORAGE_KEY = "raksha_emergency_contacts";

export const getContacts = (): EmergencyContact[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveContacts = (contacts: EmergencyContact[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
};

export const addContact = (contact: Omit<EmergencyContact, "id">): EmergencyContact => {
  const contacts = getContacts();
  const newContact = { ...contact, id: crypto.randomUUID() };
  contacts.push(newContact);
  saveContacts(contacts);
  return newContact;
};

export const removeContact = (id: string) => {
  const contacts = getContacts().filter((c) => c.id !== id);
  saveContacts(contacts);
};

export const generateSOSMessage = (lat: number, lng: number, name?: string): string => {
  const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
  return `🚨 EMERGENCY SOS ALERT!\n${name ? `From: ${name}\n` : ""}I need immediate help!\n📍 My location: ${mapLink}\nTimestamp: ${new Date().toLocaleString()}`;
};
