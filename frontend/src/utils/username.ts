import { TAKEN_USERNAMES } from '../constants/mockData';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function isUsernameFormatValid(username: string) {
  return USERNAME_REGEX.test(username.trim().toLowerCase());
}

// currentUsername lets someone "save" without changing their own username
// without it falsely flagging as taken.
export function isUsernameTaken(username: string, currentUsername?: string) {
  const normalized = username.trim().toLowerCase();
  if (currentUsername && normalized === currentUsername.trim().toLowerCase()) {
    return false;
  }
  return TAKEN_USERNAMES.includes(normalized);
}