import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { createApiGatewayServer } from '../src/server.js';

async function withServer(callback) {
  const server = createApiGatewayServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('GET /health returns the gateway health contract', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await response.json(), {
      status: 'ok',
      service: 'api-gateway',
      version: '0.1.0',
    });
  });
});

test('unknown routes return the standard not-found error shape', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/unknown`);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });

  });
});

test('OPTIONS requests return the browser CORS contract', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/discovery/offers`, { method: 'OPTIONS' });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, PATCH, DELETE, OPTIONS');
  });
});

test('gateway proxies offer requests and preserves authorization', async () => {
    const service = await new Promise((resolve) => {
      const server = createServer((request, response) => {
        assert.equal(request.headers.authorization, 'Bearer test-token');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ service: 'offer' }));
      });
      server.listen(0, () => resolve(server));
    });
    const gateway = createApiGatewayServer({
      services: {
        offer: `http://127.0.0.1:${service.address().port}`,
        vendor: 'http://127.0.0.1:1',
        discovery: 'http://127.0.0.1:1',
        identity: 'http://127.0.0.1:1',
      },
    });
    await new Promise((resolve) => gateway.listen(0, resolve));

    try {
      const response = await fetch(`http://127.0.0.1:${gateway.address().port}/api/offers/public`, {
        headers: { authorization: 'Bearer test-token' },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { service: 'offer' });
    } finally {
      await new Promise((resolve) => gateway.close(resolve));
      await new Promise((resolve) => service.close(resolve));
    }
});
