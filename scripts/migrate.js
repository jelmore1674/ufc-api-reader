#!/usr/bin/env node

'use strict';

import * as dotenv from 'dotenv';
dotenv.config();
import { execSync } from 'child_process';
const { DB_URL } = process.env;

try {
	// Run the migrate with database connection not using pooling
	// See: https://github.com/prisma/prisma/issues/4752
	execSync(`DATABASE_URL=${DB_URL} yarn prisma db pull`);
} catch (error) {
	console.error(error);
	process.exit(1);
}
