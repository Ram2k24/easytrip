import { buildApplication } from '@easytrip/api';
import type { HealthReport } from '@easytrip/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { startTestDatabase, type TestDatabase } from '../fixtures/embedded-postgres';
import { testEnv } from '../fixtures/env';
import { createDbClient, resolveMigrationsFolder, runMigrations } from '@easytrip/database';

/**
 * End-to-end HTTP verification of the Phase 05 platform surface, against the real
 * Nest application graph and a real PostgreSQL 16 cluster.
 */
describe('platform HTTP surface', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let server: unknown;

  beforeAll(async () => {
    database = await startTestDatabase({ port: 55442, label: 'http-spec' });

    const migrations = createDbClient({ connectionString: database.connectionString, poolMax: 2 });
    await runMigrations(migrations, { migrationsFolder: resolveMigrationsFolder() });
    await migrations.close();

    app = await buildApplication({ env: testEnv(database.connectionString) });
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    // Guarded: if `beforeAll` failed, `app` was never assigned.
    if (app) await app.close();
    if (database) await database.stop();
  });

  it('GET /health returns a contract-valid report proving database connectivity', async () => {
    const response = await request(server as never)
      .get('/health')
      .expect(200);

    const report = response.body.data as HealthReport;
    expect(report.service).toBe('easytrip-api-test');
    expect(report.environment).toBe('test');
    expect(report.checks.length).toBeGreaterThanOrEqual(2);

    const db = report.checks.find((check) => check.name === 'database');
    expect(db?.state).toBe('up');
    expect(db?.message).toMatch(/PostgreSQL 16\./);

    // Redis is intentionally absent in this environment: the API must still serve.
    expect(report.checks.find((check) => check.name === 'redis')?.state).toBe('down');
    expect(report.status).toBe('degraded');
  });

  it('serves the liveness aliases and never 503s while degraded', async () => {
    await request(server as never)
      .get('/healthz')
      .expect(200);
    await request(server as never)
      .get('/readyz')
      .expect(200);
    await request(server as never)
      .get('/health/ready')
      .expect(200);
  });

  it('reports the service identity at the root', async () => {
    const response = await request(server as never)
      .get('/')
      .expect(200);
    expect(response.body.data).toMatchObject({ service: 'easytrip-api-test', apiVersion: 'v1' });
  });

  it('exposes prometheus metrics as raw text, not the JSON envelope', async () => {
    const response = await request(server as never)
      .get('/metrics')
      .expect(200);
    expect(response.headers['content-type']).toContain('text/plain');
    // A scraper must be able to parse the body directly — no {"data": "..."} wrapper.
    expect(response.text.startsWith('# HELP')).toBe(true);
    expect(response.text).toContain('# TYPE process_uptime_seconds gauge');
    expect(response.text).toContain('http_requests_total');
    expect(() => {
      JSON.parse(response.text);
    }).toThrow();
  });

  it('wraps unknown routes in the error envelope with a requestId', async () => {
    const response = await request(server as never)
      .get('/v1/does-not-exist')
      .expect(404);
    expect(response.body.error).toMatchObject({ code: 'ETN-SYS-404' });
    expect(response.body.error.requestId).toEqual(expect.any(String));
    // Framework wording must not leak (Arch §17.2).
    expect(response.body.error.message).not.toContain('Cannot GET');
  });

  it('echoes an inbound correlation id on success and error responses', async () => {
    const ok = await request(server as never)
      .get('/health')
      .set('x-request-id', 'trace-abc')
      .expect(200);
    expect(ok.headers['x-request-id']).toBe('trace-abc');
    expect(ok.body.data).toBeDefined();

    const missing = await request(server as never)
      .get('/v1/does-not-exist')
      .set('x-request-id', 'trace-def')
      .expect(404);
    expect(missing.headers['x-request-id']).toBe('trace-def');
    expect(missing.body.error.requestId).toBe('trace-def');
  });

  it('generates a request id when the caller supplies none', async () => {
    const response = await request(server as never)
      .get('/health')
      .expect(200);
    expect(response.headers['x-request-id']).toMatch(/^req_[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('exposes the readiness alias under /health/ready as well', async () => {
    const response = await request(server as never)
      .get('/health/ready')
      .expect(200);
    expect(response.body.data.status).toBe('degraded');
  });
});
