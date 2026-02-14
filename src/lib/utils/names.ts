import type { Contact, ContactAlias } from '@/types';

export function resolveDisplayName(
  jid: string,
  contact?: Contact | null,
  alias?: ContactAlias | string | null
): string {
  const aliasText = typeof alias === 'string' ? alias : alias?.alias;
  
  if (aliasText?.trim()) {
    return aliasText.trim();
  }

  if (contact?.push_name?.trim()) {
    return contact.push_name.trim();
  }

  if (contact?.full_name?.trim()) {
    return contact.full_name.trim();
  }

  if (contact?.business_name?.trim()) {
    return contact.business_name.trim();
  }

  if (contact?.phone?.trim()) {
    return contact.phone.trim();
  }

  return jid;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

export function extractPhoneFromJid(jid: string): string | null {
  const match = jid.match(/^(\d+)@/);
  return match ? match[1] : null;
}

export function isGroupJid(jid: string): boolean {
  return jid.includes('@g.us');
}

export function isUserJid(jid: string): boolean {
  return jid.includes('@s.whatsapp.net');
}

export function isBroadcastJid(jid: string): boolean {
  return jid.includes('@broadcast');
}

export function isStatusJid(jid: string): boolean {
  return jid === 'status@broadcast';
}
