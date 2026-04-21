export async function runWithMockMode({ mockMode, mockResponse, request }) {
  if (mockMode) {
    return typeof mockResponse === 'function' ? mockResponse() : mockResponse;
  }

  return request();
}

export class StreamProtocolError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'StreamProtocolError';
    Object.assign(this, options);
  }
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

export function createJsonEventStreamParser({ onEvent } = {}) {
  let buffer = '';
  let sawDone = false;

  const emitLine = (line) => {
    const normalizedLine = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (!normalizedLine.startsWith('data: ')) {
      return;
    }

    const payload = normalizedLine.slice(6).trim();
    if (!payload) {
      return;
    }

    let event;
    try {
      event = JSON.parse(payload);
    } catch (error) {
      throw new StreamProtocolError('Failed to parse SSE event payload', {
        cause: error,
        payload,
      });
    }

    if (event?.type === 'done') {
      sawDone = true;
    }

    onEvent?.(event);
  };

  return {
    push(chunk) {
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        emitLine(line);
      }
    },
    finish() {
      if (buffer.trim()) {
        throw new StreamProtocolError('Stream ended with an incomplete SSE event payload', {
          payload: buffer.trim(),
        });
      }

      if (!sawDone) {
        throw new StreamProtocolError('Stream ended before done event');
      }
    },
  };
}

async function consumeJsonEventStream(stream, { onChunk, onEvent } = {}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parser = createJsonEventStreamParser({ onEvent });

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    onChunk?.(value);
    parser.push(decoder.decode(value, { stream: true }));
  }

  const trailingChunk = decoder.decode();
  if (trailingChunk) {
    parser.push(trailingChunk);
  }

  parser.finish();
}

async function buildResponseError(response) {
  let data = {};

  try {
    const clone = typeof response.clone === 'function' ? response.clone() : response;
    const contentType = clone.headers?.get?.('content-type') || '';

    if (contentType.toLowerCase().includes('application/json')) {
      data = await clone.json();
    } else {
      const text = await clone.text();
      if (text) {
        data = { detail: text };
      }
    }
  } catch {
    data = {};
  }

  const detail = typeof data.detail === 'string'
    ? data.detail
    : data.detail?.detail || response.statusText || 'Request failed';

  return Object.assign(new Error(detail), {
    response: {
      status: response.status,
      data,
    },
  });
}

export async function streamSseJsonWithAuthRetry({
  url,
  init = {},
  getAccessToken,
  refreshAccessToken,
  fetchImpl = globalThis.fetch,
  onResponse,
  onChunk,
  onEvent,
} = {}) {
  const response = await fetchWithAuthRetry({
    url,
    init,
    getAccessToken,
    refreshAccessToken,
    fetchImpl,
  });

  onResponse?.(response);

  if (!response.ok) {
    throw await buildResponseError(response);
  }

  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.toLowerCase().includes('text/event-stream')) {
    throw new StreamProtocolError(
      `Expected text/event-stream but received ${contentType || 'unknown content-type'}`,
      { response: { status: response.status } },
    );
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new StreamProtocolError('Streaming response body is unavailable', {
      response: { status: response.status },
    });
  }

  await consumeJsonEventStream(response.body, {
    onChunk,
    onEvent,
  });

  return response;
}
