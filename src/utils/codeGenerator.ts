// Alphabet without ambiguous characters (no 0, O, 1, I, 5, S)
const CHARS = 'ABCDEFGHJKLMNPQRTVWXYZ2346789';

export function generateRoomCode(length: number = 5): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

export function generateDeviceId(): string {
  return 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
