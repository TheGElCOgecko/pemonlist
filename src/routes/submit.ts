import type { Request } from "express";

import type { Device, Entry, Level, std } from "../../dbschema/interfaces";
import app from "../app";
import db from "../db";
import { isNullOrUndefined, requireLogin } from "../util";

app.get("/submit", requireLogin, async (req, res) => {
	if (req.account!.status !== "Done") {
		return res.redirect("/account");
	}

	const levels = await db.cachedQuery<Level>(`
        select Level {
            name, level_id, placement, creator
        } order by .placement limit 150
	`, null, { serveStaleContent: true });

    res.renderPage("/submit", { levels });
});

export interface RecordInfo {
    time: string,
    levelid: number,
    videoid: string,
    raw: string,
    device: Device,
    notes: string
}

app.post("/submit", requireLogin, async (req: Request<unknown, unknown, RecordInfo>, res) => {
	req.body.levelid = Number(req.body.levelid);
	req.body.device = req.body.device.toCapital() as Device;

	const data = await db.querySingle<{ level: std.BaseObject, entry: Entry }>(`
		with lvl := (select Level filter .level_id = <int64>$level_id)
		select {
			level := lvl,
			entry := (
				with entry := (
					select Entry { id, time } filter
					    .video_id = <str>$video_id and
					    .level = lvl and
					    .status != Status.Denied
						limit 1
				) select <Entry>{} if exists entry and (entry.time <= <duration><str>$time) ?? false else (insert Entry {
		            status := Status.Waiting,
		            video_id := <str>$video_id,
		            raw_video := <str>$raw,
		            player := <Player><uuid><str>$player_id,
		            level := lvl,
		            time := <duration><str>$time,
		            mobile := <bool>$mobile,
		            notes := <str>$notes
				})
			)
		}
	`, {
		level_id: req.body.levelid ?? 0,
		video_id: req.body.videoid ?? req.body.raw,
		time: req.body.time,
		raw: req.body.raw,
		player_id: req.account!.player!.id,
		mobile: req.body.device === "Mobile",
		notes: req.body.notes
	});

	if (isNullOrUndefined(data)) return res.redirect("/submit");
	if (isNullOrUndefined(data?.level)) return res.redirect("/submit");
	if (isNullOrUndefined(data?.entry)) return res.renderPage("/duplicate");

	res.renderPage("/submitted");
});
