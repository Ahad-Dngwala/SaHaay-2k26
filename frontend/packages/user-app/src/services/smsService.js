// SMS Service for emergency dispatch (Android only)
import { Linking } from 'react-native';

export const sendEmergencySMS = async (phoneNumber, message) => {
  const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(url);
    return { success: true };
  } catch (error) {
    console.log('SMS failed:', error);
    return { success: false, error };
  }
};

export const sendToContacts = async (contacts, message) => {
  const results = [];
  for (const contact of contacts) {
    const result = await sendEmergencySMS(contact.phone, message);
    results.push({ contact, ...result });
  }
  return results;
};
