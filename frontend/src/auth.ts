export const attemptAuthRefresh = async () => {
  const refreshResponse = await fetch("/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!refreshResponse.ok) return;

  const { token: newToken } = await refreshResponse.json();
  sessionStorage.setItem("authToken", newToken);

  return newToken;
};
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem("authToken");
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status !== 401) return response;

  const newToken = await attemptAuthRefresh();
  if (!newToken) return response;

  sessionStorage.setItem("authToken", newToken);
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${newToken}`,
    },
  });
};
