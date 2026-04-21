export async function runWithMockMode({ mockMode, mockResponse, request }) {
  if (mockMode) {
    return typeof mockResponse === 'function' ? mockResponse() : mockResponse;
  }

  return request();
}

export async function fetchWithAuthRetry({
  url,
  init = {},
  getAccessToken,
  refreshAccessToken,
  fetchImpl = globalThis.fetch,
}) {
  const performFetch = async (token) => {
    const headers = new Headers(init.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetchImpl(url, {
      credentials: 'include',
      ...init,
      headers,
    });
  };

  const initialToken = getAccessToken?.() || null;
  let response = await performFetch(initialToken);

  if (response.status !== 401 || !refreshAccessToken) {
    return response;
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    return response;
  }

  response = await performFetch(refreshedToken);
  return response;
}
