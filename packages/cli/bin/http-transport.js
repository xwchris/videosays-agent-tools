import dns from 'node:dns';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import tls from 'node:tls';
import { performance } from 'node:perf_hooks';

const H2_UNSUPPORTED = 'VIDEOSAYS_H2_UNSUPPORTED';

function abortError(signal) {
  return signal?.reason instanceof Error ? signal.reason : new Error('Request aborted.');
}

function uniqueAddresses(addresses) {
  const seen = new Set();
  return addresses.filter(({ address, family }) => {
    const key = `${family}:${address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function prioritizeAddresses(addresses) {
  const remaining = [...addresses];
  if (remaining.length < 3) return remaining;

  const ordered = [remaining.shift()];
  while (remaining.length) {
    const preferredFamily = ordered.at(-1).family === 6 ? 4 : 6;
    const preferredIndex = remaining.findIndex(({ family }) => family === preferredFamily);
    ordered.push(remaining.splice(preferredIndex === -1 ? 0 : preferredIndex, 1)[0]);
  }
  return ordered;
}

export function rotateAddresses(addresses, offset = 0) {
  if (addresses.length < 2) return [...addresses];
  const index = ((offset % addresses.length) + addresses.length) % addresses.length;
  return [...addresses.slice(index), ...addresses.slice(0, index)];
}

export function resolveAddresses(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (lookupError, addresses) => {
      if (lookupError) {
        reject(lookupError);
        return;
      }
      const resolved = prioritizeAddresses(uniqueAddresses(addresses));
      if (!resolved.length) {
        reject(new Error(`No IP addresses found for ${hostname}.`));
        return;
      }
      resolve(resolved);
    });
  });
}

function boundedSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(abortError(parentSignal));
  if (parentSignal?.aborted) onAbort();
  else parentSignal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out.', 'TimeoutError')), timeoutMs);
  timer.unref?.();
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onAbort);
    },
  };
}

function responseHeaders(rawHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(rawHeaders)) {
    if (name.startsWith(':') || value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, String(item));
    } else {
      headers.set(name, String(value));
    }
  }
  return headers;
}

function bufferedResponse(status, rawHeaders, chunks, metadata) {
  const body = Buffer.concat(chunks);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: responseHeaders(rawHeaders),
    metadata,
    async json() {
      return JSON.parse(body.toString('utf8'));
    },
    async text() {
      return body.toString('utf8');
    },
  };
}

function normalizedHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {})
      .filter(([name]) => !['connection', 'host', 'transfer-encoding'].includes(name.toLowerCase()))
      .map(([name, value]) => [name.toLowerCase(), value]),
  );
}

function connectH2(url, address) {
  const port = Number(url.port) || 443;
  return http2.connect(url.origin, {
    createConnection: () => tls.connect({
      host: address.address,
      port,
      family: address.family,
      servername: url.hostname,
      ALPNProtocols: ['h2', 'http/1.1'],
    }),
  });
}

export async function requestHttp2(urlValue, options, address) {
  const url = new URL(urlValue);
  const signal = options.signal;
  if (signal?.aborted) throw abortError(signal);

  const startedAt = performance.now();
  const session = connectH2(url, address);
  let stream;
  let connected = false;
  const onSessionError = () => {};
  session.on('error', onSessionError);
  const onAbort = () => {
    stream?.close(http2.constants.NGHTTP2_CANCEL);
    session.destroy(abortError(signal));
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    await new Promise((resolve, reject) => {
      session.once('connect', () => {
        connected = true;
        resolve();
      });
      session.once('error', reject);
    });

    if (session.socket?.alpnProtocol !== 'h2') {
      const unsupported = new Error('The server did not negotiate HTTP/2.');
      unsupported.code = H2_UNSUPPORTED;
      throw unsupported;
    }

    return await new Promise((resolve, reject) => {
      let status = 0;
      let rawHeaders = {};
      const chunks = [];
      stream = session.request({
        ':method': options.method || 'GET',
        ':path': `${url.pathname}${url.search}`,
        ':scheme': 'https',
        ':authority': url.host,
        ...normalizedHeaders(options.headers),
      });
      stream.once('response', (headers) => {
        status = Number(headers[':status']) || 0;
        rawHeaders = headers;
      });
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.once('error', reject);
      stream.once('end', () => {
        resolve(bufferedResponse(status, rawHeaders, chunks, {
          protocol: 'h2',
          address: session.socket?.remoteAddress || address.address,
          family: address.family,
          durationMs: performance.now() - startedAt,
        }));
      });
      if (options.body != null) stream.end(options.body);
      else stream.end();
    });
  } finally {
    signal?.removeEventListener('abort', onAbort);
    if (connected && !session.destroyed) session.close();
    else if (!session.destroyed) session.destroy();
  }
}

export function requestHttp1(urlValue, options, address) {
  const url = new URL(urlValue);
  const client = url.protocol === 'https:' ? https : http;
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const request = client.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: options.method || 'GET',
      headers: options.headers,
      agent: false,
      signal: options.signal,
      ...(address ? {
        family: address.family,
        lookup: (_hostname, _lookupOptions, callback) => callback(null, address.address, address.family),
      } : {}),
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.once('error', reject);
      response.once('end', () => {
        resolve(bufferedResponse(response.statusCode || 0, response.headers, chunks, {
          protocol: 'http/1.1',
          address: response.socket?.remoteAddress || address?.address || null,
          family: address?.family || null,
          durationMs: performance.now() - startedAt,
        }));
      });
    });
    request.once('error', reject);
    if (options.body != null) request.end(options.body);
    else request.end();
  });
}

export async function requestWithPreferredProtocol(urlValue, options = {}, attempt = 1) {
  const url = new URL(urlValue);
  const addresses = rotateAddresses(await resolveAddresses(url.hostname), attempt - 1);
  const address = addresses[0];
  const disableHttp2 = process.env.VIDEOSAYS_DISABLE_HTTP2 === '1';

  if (url.protocol !== 'https:' || disableHttp2) {
    return requestHttp1(url, options, address);
  }

  const h2Attempt = boundedSignal(options.signal, 5_000);
  try {
    return await requestHttp2(url, { ...options, signal: h2Attempt.signal }, address);
  } catch (requestError) {
    if (options.signal?.aborted) throw requestError;
    return requestHttp1(url, options, address);
  } finally {
    h2Attempt.cleanup();
  }
}

export async function diagnoseEndpoint(urlValue, timeoutMs = 8_000) {
  const url = new URL(urlValue);
  const addresses = await resolveAddresses(url.hostname);
  const probes = await Promise.all(addresses.map(async (address) => {
    const startedAt = performance.now();
    const baseOptions = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Videosays-CLI-Doctor',
      },
    };
    try {
      let response;
      let h2Error;
      if (url.protocol === 'https:') {
        try {
          response = await requestHttp2(url, { ...baseOptions, signal: AbortSignal.timeout(Math.min(5_000, timeoutMs)) }, address);
        } catch (requestError) {
          h2Error = requestError;
        }
      }
      if (!response) {
        try {
          response = await requestHttp1(url, { ...baseOptions, signal: AbortSignal.timeout(timeoutMs) }, address);
        } catch (requestError) {
          if (h2Error) {
            throw new Error(`h2 ${h2Error?.cause?.code || h2Error?.code || h2Error?.name}; http/1.1 ${requestError?.cause?.code || requestError?.code || requestError?.name}`);
          }
          throw requestError;
        }
      }
      return {
        ok: response.status > 0,
        address: address.address,
        family: address.family,
        protocol: response.metadata.protocol,
        status: response.status,
        edgeColo: response.headers.get('x-videosays-edge-colo') || null,
        placement: response.headers.get('cf-placement') || null,
        durationMs: Math.round(response.metadata.durationMs),
      };
    } catch (probeError) {
      return {
        ok: false,
        address: address.address,
        family: address.family,
        protocol: url.protocol === 'https:' ? 'h2' : 'http/1.1',
        durationMs: Math.round(performance.now() - startedAt),
        error: probeError?.message || probeError?.cause?.code || probeError?.code || probeError?.name || 'network_error',
      };
    }
  }));
  return { hostname: url.hostname, addresses, probes };
}
