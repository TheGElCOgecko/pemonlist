import { getHeapStatistics } from "v8";

import type { Account, Entry, Level, Player } from "../../dbschema/interfaces";
import app from "../app";
import db, { cache } from "../db";
import { isNullOrUndefined, sortObjectKeys } from "../util";

const startTime = Date.now();

app.get("/api/uptime", async (req, res) => {
	if (req.version <= 2) {
		res.json(sortObjectKeys({
			startup: startTime / 1000,
			uptime: (Date.now() - startTime) / 1000,
			tasks: 1,
			workers: 1
		}));
		return;
	}

	const start = { cpu: process.cpuUsage(), time: Bun.nanoseconds() };
	await new Promise(r => setTimeout(r, 100));
	const elapsed = { cpu: process.cpuUsage(start.cpu), time: Bun.nanoseconds() - start.time };

	res.json(sortObjectKeys({
		startup: Number(Math.round(Date.now() - (process.uptime() * 1000)).toFixed(3)),
		uptime: Number(process.uptime().toFixed(3)),
		memory: getHeapStatistics().total_heap_size / 1024 / 1024,
		cachedObjects: cache.size,
		cpuUsage: (elapsed.cpu.user + elapsed.cpu.system) / elapsed.time // idek if this actually works tbh
	}));
});

app.get("/api/docs", (_, res) => {
	res.renderPage("/docs/index");
});

app.get("/api/docs/endpoints", (_, res) => {
	res.renderPage("/docs/endpoints");
});

app.get("/api/level/:id", async (req, res) => {
	const level = await db.cachedQuerySingle<{ records: Entry[] } & Level>(`
		select Level {
	        placement,
	        level_id,
	        name,
	        creator,
	        verifier: { id, name },
	        video_id,
	        points,
	        records := (select .entries {
	            player: {
	                id,
	                name
	            },
	            timestamp_milliseconds := (select duration_get(<cal::relative_duration>.time, "milliseconds")),
	            formatted_time := (select to_str(.time, "FMHH24:MI:SS.MS")),
	            video_id,
	            mobile,
	            rank
	        } filter .status = Status.Approved order by .time)
	    } filter .level_id = <int64>$id
	`, { id: Number(req.params.id) }, { timeToLive: 60e3 });

	if (isNullOrUndefined(level)) {
		res.status(400).json(sortObjectKeys({
			error: true,
			code: "bad_level_id"
		}));
	} else {
		level!.records = level!.records.map(v => sortObjectKeys<Entry>(v));
		res.json(sortObjectKeys<Level>(level as object));
	}
});

app.get("/api/list", async (req, res) => {
	if (req.version <= 1) {
		res.json((await db.cachedQuery<Level>(`
			select Level {
	            placement,
	            level_id,
	            name,
	            creator,
	            verifier: { id, name },
	            video_id,
	            top_record := (select .entries {
	                player: {
	                    id,
	                    name
	                },
	                timestamp_milliseconds := (select duration_get(<cal::relative_duration>.time, "milliseconds")),
	                formatted_time := (select to_str(.time, "FMHH24:MI:SS.MS"))
	            } filter .status = Status.Approved  order by .time limit 1)
	        } order by .placement offset {} limit {}
		`)).map(v => sortObjectKeys<Level>(v)));
		return;
	}

	const { limit } = req;

	if (req.page <= 0) {
		res.status(400).json(sortObjectKeys({
			error: true,
			code: "bad_page"
		}));
		return;
	}
	if (limit < 0) {
		res.status(400).json(sortObjectKeys({
			error: true,
			code: "bad_limit"
		}));
		return;
	}

	const list = (await db.cachedQuerySingle<{ data: Level[], count: number }>(`
		select {
			data := (
				select Level {
			        placement,
			        level_id,
			        name,
			        creator,
			        verifier: { id, name },
			        video_id,
			        top_record := (select .entries {
			            player: {
			                id,
			                name
			            },
			            timestamp_milliseconds := (select duration_get(<cal::relative_duration>.time, "milliseconds")),
			            formatted_time := (select to_str(.time, "FMHH24:MI:SS.MS"))
			        } filter .status = Status.Approved  order by .time limit 1)
			    } order by .placement offset <int32>$offset limit <int32>$limit
			),
			count := (select count(Level))
		}
	`, {
		offset: (req.page - 1) * limit,
		limit
	}, { timeToLive: 60e3 }))!;
	if (!isNullOrUndefined(list)) list.data = list.data.map(v => sortObjectKeys<Level>(v));

	res.json(sortObjectKeys<{ data: Level[], count: number }>(list));
});

app.get("/api/player/:player", async (req, res) => {
	const playerName = req.params.player;
	const isId = /[a-zA-Z0-9-]+/.test(playerName) && playerName.replaceAll("-", "").length === 32;

	const playerFromDiscord = await db.cachedQuerySingle<Account>(`
		select Account { player } filter . discord.user_id = <str>$playerName limit 1;
	`, { playerName }, { timeToLive: 60e3 });

	const player = await db.cachedQuerySingle<{ records: Entry[] } & Player>(`
	    select Player {
	        id,
	        name,
	        points,
	        verifications: {
	            level := (
	                with ID := .id
	                select Level {
	                    name,
	                    level_id,
	                    placement
	                } filter .id = ID
	            ),
	            video_id
	        },
	        records := (select .entries {
	            level: { name, level_id, placement },
	            timestamp_milliseconds := (select duration_get(<cal::relative_duration>.time, "milliseconds")),
	            formatted_time := (select to_str(.time, "FMHH24:MI:SS.MS")),
	            video_id,
	            mobile,
	            rank
	        } order by .level.placement),
	        rank,
	        device
	    } filter .name = ((<Player><uuid><str>$playerName).name if <bool>$isId else <str>$playerName)
	`, {
		playerName: isNullOrUndefined(playerFromDiscord) ? playerName : playerFromDiscord?.player?.id,
		isId: isNullOrUndefined(playerFromDiscord) ? isId : true
	}, { timeToLive: 60e3 });

	if (isNullOrUndefined(player))
		res.status(400).json(sortObjectKeys({
			error: true,
			code: "bad_user"
		}));
	else {
		player!.verifications = player!.verifications.map(v => sortObjectKeys<Level>(v));
		player!.records = player!.records.map(v => sortObjectKeys<Entry>(v));
		res.json(sortObjectKeys<Player>(player as object));
	}
});
