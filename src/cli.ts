#!/usr/bin/env tsx
/**
 * `etn` — workspace development CLI.
 *
 * Thin dispatch layer over `@easytrip/database`: environment validation,
 * migrations, seeding and status. Business logic never lives here (Arch §2.1
 * "controllers contain no business logic" applies to the CLI too).
 */
import { checkEnv } from './commands/check-env.js';
import { dbMigrate } from './commands/db-migrate.js';
import { dbReset } from './commands/db-reset.js';
import { dbServe } from './commands/db-serve.js';
import { dbSeed } from './commands/db-seed.js';
import { dbStatus } from './commands/db-status.js';

const HELP = `Easy Trip Nepal — workspace CLI

Usage: pnpm <script> [options]

  check:env                      Validate the environment against the shared schema
  db:status                      Connectivity, server version, migrations, tables
  db:migrate                     Apply pending migrations
  db:seed [options]              Run the seed registry
      --list                       list registered seeders and exit
      --only <name>                run a single seeder (repeatable)
      --with-demo                  include development-only synthetic fixtures
      --dry-run                    roll the transaction back
  db:reset [--with-demo]         Drop schema, re-migrate, re-seed (dev/test only)
  db:serve                       Run a local PostgreSQL 16 without Docker
`;

interface ParsedArgs {
  command: string;
  only: string[];
  withDemo: boolean;
  dryRun: boolean;
  list: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: argv[0] ?? 'help',
    only: [],
    withDemo: false,
    dryRun: false,
    list: false,
  };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--with-demo') parsed.withDemo = true;
    else if (arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '--list') parsed.list = true;
    else if (arg === '--only') {
      const value = argv[index + 1];
      if (value === undefined) throw new Error('--only requires a seeder name');
      parsed.only.push(value);
      index += 1;
    } else if (arg !== undefined && arg.startsWith('--only=')) {
      parsed.only.push(arg.slice('--only='.length));
    } else {
      throw new Error(`Unknown argument: ${String(arg)}`);
    }
  }
  return parsed;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case 'check:env':
      return checkEnv();
    case 'db:status':
      return dbStatus();
    case 'db:migrate':
      return dbMigrate();
    case 'db:seed':
      return dbSeed({
        ...(args.only.length > 0 ? { only: args.only } : {}),
        withDemo: args.withDemo,
        dryRun: args.dryRun,
        list: args.list,
      });
    case 'db:reset':
      return dbReset({ withDemo: args.withDemo });
    case 'db:serve':
      return dbServe();
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(HELP);
      return 0;
    default:
      process.stdout.write(`Unknown command: ${args.command}\n\n${HELP}`);
      return 1;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stdout.write(`✗ ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
