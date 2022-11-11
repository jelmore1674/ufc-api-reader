import axios from 'axios';
import 'dotenv/config';
import knex from 'knex';
import ora from 'ora';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Connect to database
const pg = knex({
	client: 'pg',
	connection: process.env.DB_URL,
	searchPath: ['knex', 'public'],
});

// events stores only events that have not happened yet
let events = [];
// starting point to search events by id
let eventId = 1090;
// for the do while... keeps running as long as event is not empty
let emptyEvent = false;

// Conosle animation
const scanning = ora({
	color: 'red',
	prefixText: 'Scanning database',
	spinner: {
		interval: 180, // Optional
		frames: ['.', '..', '...', ' '],
	},
}).start();

try {
	do {
		// fetch event from api
		const response = await axios.get(
			`https://d29dxerjsp82wz.cloudfront.net/api/v3/event/live/${eventId}.json`
		);
		const { EventId, Name, StartTime } = response.data.LiveEventDetail;
		// Checking if there is a EventId
		if (EventId) {
			eventId = eventId + 1;
			let today = new Date();
			// Only will add events that have not taken place yet.
			if (
				Name.match(/UFC /gi) &&
				Date.parse(StartTime) > today.setDate(today.getDate() - 3)
			) {
				events.push(response.data);
			}
		} else {
			emptyEvent = true;
			scanning.succeed();
		}
	} while (!emptyEvent);
} catch (err) {
	scanning.fail();
	console.error(err);
	process.exit(1);
}

const sorting = ora({
	color: 'red',
	prefixText: 'Sorting events',
	spinner: {
		interval: 180, // Optional
		frames: ['.', '..', '...', ' '],
	},
}).start();
// sort events by event date
events = events.sort(
	(a, b) =>
		new Date(a.LiveEventDetail.StartTime) -
		new Date(b.LiveEventDetail.StartTime)
);
sorting.succeed();

const database = ora({
	color: 'red',
	prefixText: 'Adding to database',
	spinner: {
		interval: 180, // Optional
		frames: ['.', '..', '...', ' '],
	},
}).start();

try {
	// insert events into the database
	await Promise.all(
		events.map(async ({ LiveEventDetail }) => {
			const { EventId, Name, Status, StartTime } = LiveEventDetail;
			return await prisma.events.upsert({
				where: {
					eventid: EventId,
				},
				update: {
					eventid: EventId,
					name: Name,
					status: Status,
					eventdate: new Date(StartTime),
					updated: new Date(),
				},
				create: {
					eventid: EventId,
					name: Name,
					status: Status,
					eventdate: new Date(StartTime),
					added: new Date(),
				},
			});
			// return await pg
			// 	.insert({
			// 		eventid: EventId,
			// 		name: Name,
			// 		status: Status,
			// 		eventdate: StartTime,
			// 		added: pg.fn.now(),
			// 	})
			// 	.into('events')
			// 	.onConflict('eventid')
			// 	.merge(['name', 'added', 'eventdate', 'status']);
		})
	);
	database.succeed();
} catch (e) {
	database.fail();
	console.error(e);
	process.exit(1);
} finally {
	process.exit(0);
}
