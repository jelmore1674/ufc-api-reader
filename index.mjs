import axios from 'axios';
import 'dotenv/config';
import knex from 'knex';
import ora from 'ora';

const pg = knex({
	client: 'pg',
	connection: process.env.DB_URL,
	searchPath: ['knex', 'public'],
});

async function fetchData() {
	let events = [];
	let count = 1090;
	let apiError = false;

	const throbber = ora({
		color: 'red',
		prefixText: 'Scanning database',
		spinner: {
			interval: 180, // Optional
			frames: ['.', '..', '...', ' '],
		},
	}).start();

	try {
		do {
			const response = await axios.get(
				`https://d29dxerjsp82wz.cloudfront.net/api/v3/event/live/${count}.json`
			);
			const { data } = response;
			const { LiveEventDetail } = data;
			if (LiveEventDetail.EventId) {
				count = count + 1;
				if (
					LiveEventDetail.Name.match(/UFC /gi) &&
					Date.parse(LiveEventDetail.StartTime) > new Date()
				) {
					events.push(data);
				}
			} else {
				apiError = true;
				throbber.succeed();
			}
		} while (!apiError);
	} catch (err) {
		console.error(err);
		throbber.fail(err);
	}

	const sorting = ora({
		color: 'red',
		prefixText: 'Sorting events',
		spinner: {
			interval: 180, // Optional
			frames: ['.', '..', '...', ' '],
		},
	}).start();
	events.sort(
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
		await Promise.all(
			events.map(async ({ LiveEventDetail }) => {
				let event = await pg('events').where({
					eventid: LiveEventDetail.EventId,
					name: LiveEventDetail.Name,
				});

				if (!event.length) {
					console.log(LiveEventDetail.Name);
					await pg
						.insert({
							eventid: LiveEventDetail.EventId,
							name: LiveEventDetail.Name,
						})
						.into('events');
				}
			})
		);
	} catch (e) {
		database.fail();
	} finally {
		database.succeed();
		process.exit(0);
	}
}

fetchData();
