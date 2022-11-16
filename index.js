import axios from 'axios';
import ora from 'ora';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// get events from db
let events = await prisma.events.findMany({
	select: {
		eventid: true,
	},
	orderBy: {
		eventid: 'desc',
	},
});
// starting point to search events by id
let eventId = events[0].eventid;

// for the do while... keeps running as long as event is not empty
let emptyEvent = false;

const TODAY = new Date();
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
	events = await Promise.all(
		events.map(async ({ eventid }) => {
			// fetch event from api
			const { data } = await axios.get(
				`https://d29dxerjsp82wz.cloudfront.net/api/v3/event/live/${eventid}.json`
			);
			return data;
		})
	);

	do {
		// fetch event from api
		const response = await axios.get(
			`https://d29dxerjsp82wz.cloudfront.net/api/v3/event/live/${eventId}.json`
		);
		const { EventId, Name } = response.data.LiveEventDetail;
		// Checking if there is a EventId
		if (EventId) {
			eventId = eventId + 1;

			// Only will add events that have not taken place yet.
			if (Name.match(/UFC /gi)) {
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
events = events
	.sort(
		(a, b) =>
			new Date(a.LiveEventDetail.StartTime) -
			new Date(b.LiveEventDetail.StartTime)
	)
	.filter(
		(event) =>
			Date.parse(event.LiveEventDetail.StartTime) >
			TODAY.setDate(TODAY.getDate() - 3)
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
			const { EventId, Name, Status, StartTime, FightCard } =
				LiveEventDetail;
			// insert all fights for the event into the db
			await Promise.all(
				FightCard.map(async ({ FightId, Status, Fighters }) => {
					// Gets the winnder from the fight
					const [winner] = Fighters.filter(
						(fighter) => fighter.Outcome.Outcome === 'Win'
					);
					// Checks if fight is a draw
					const [isDraw] = Fighters.filter(
						(fighter) => fighter.Outcome.Outcome === 'Draw'
					);
					// Checks if fight is a no contest
					const [isNoContest] = Fighters.filter(
						(fighter) => fighter.Outcome.Outcome === 'No Contest'
					);

					return prisma.fight.upsert({
						where: {
							id: FightId,
						},
						update: {
							id: FightId,
							event_id: EventId,
							status: Status,
							winner: winner && winner.FighterId,
							draw: Boolean(isDraw),
							no_contest: Boolean(isNoContest),
							updated: new Date(),
						},
						create: {
							id: FightId,
							event_id: EventId,
							status: Status,
						},
					});
				})
			);

			return prisma.events.upsert({
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
