import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const serviceName = 'api-gateway';
const serviceVersion = '0.1.0';
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const defaultServices = {
  vendor: process.env.VENDOR_SERVICE_URL ?? 'http://localhost:8081',
  offer: process.env.OFFER_SERVICE_URL ?? 'http://localhost:8082',
  discovery: process.env.DISCOVERY_SERVICE_URL ?? 'http://localhost:8083',
  identity: process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:8084',
};
const defaultProxyTimeoutMs = Number.parseInt(
  process.env.GATEWAY_PROXY_TIMEOUT_MS ?? '3000',
  10,
);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.setHeader('access-control-allow-origin', process.env.CORS_ORIGIN ?? '*');
  response.setHeader('access-control-allow-headers', 'authorization, content-type');
  response.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function routeFor(pathname) {
  if (pathname.startsWith('/api/vendors/')) {
    return 'vendor';
  }
  if (pathname.startsWith('/api/offers')) {
    return 'offer';
  }
  if (pathname.startsWith('/api/discovery/')) {
    return 'discovery';
  }
  if (pathname.startsWith('/api/auth/')) {
    return 'identity';
  }
  return null;
}

async function proxy(request, response, services, timeoutMs) {
  const url = new URL(request.url, 'http://gateway.local');
  const service = routeFor(url.pathname);
  if (!service) {
    sendJson(response, 404, {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
    return;
  }

  const headers = {};
  for (const name of ['authorization', 'content-type', 'x-projection-token']) {
    const value = request.headers[name];
    if (value) {
      headers[name] = value;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await readRequestBody(request);
    const upstream = await fetch(`${services[service]}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });
    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      response.setHeader('content-type', contentType);
    }
    response.writeHead(upstream.status);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    const code = error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
    sendJson(response, 502, {
      error: {
        code,
        message: 'Upstream service is unavailable',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function createApiGatewayServer({
  services = defaultServices,
  proxyTimeoutMs = defaultProxyTimeoutMs,
} = {}) {
  return createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      });
      response.end();
      return;
    }

    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        service: serviceName,
        version: serviceVersion,
      });
      return;
    }

    await proxy(request, response, services, proxyTimeoutMs);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createApiGatewayServer();
  server.listen(port, () => {
    console.log(`${serviceName} listening on port ${port}`);
  });
}
