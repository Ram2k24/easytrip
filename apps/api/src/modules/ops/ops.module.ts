import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller.js';

/** Ops module — service identity and metrics (Arch §3.4). */
@Module({ controllers: [OpsController] })
export class OpsModule {}
