export const adminFetch = async (url: string, init?: any) => {
  return fetch(url, init);
};

export const getValidAdminToken = async () => null;
export const loadSession = () => null;
export const clearSession = () => {};

export default {
  adminFetch,
  getValidAdminToken,
  loadSession,
  clearSession
};
