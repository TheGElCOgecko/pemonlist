import cookieParser from "cookie-parser";
import express, { type Request } from "express";
import nunjucks from "nunjucks";

import type { Account, AuthToken } from "../dbschema/interfaces";
import { db } from "./db";
import translations from "./translations";
import { isNullOrUndefined } from "./util";

export const app = express();

const nj = nunjucks.configure("www/html", {
	autoescape: true,
	express: app
}).addFilter("sandwich", function(str: string, count: number) {
    return str.split("{}")[count];
});

app.set("view engine", "html");
app.use("/static", express.static("www/static"));
app.use("/translations", express.static("www/translations"));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

declare module "express-serve-static-core" {
  interface Request {
    account?: Account;
    page: number;
	limit: number;
	version: number;
    timestamp: number;
  }
}

declare global {
	namespace Express {
		interface Response {
			renderPage(template: string, data?: { [key: string | number]: unknown }): Promise<void>
		}
	}
}

export interface Cookies {
	lang?: string,
	token?: string
}

export interface Query {
	page?: number,
	limit?: number,
	version?: number
}

app.use(async (req: Request<unknown, unknown, unknown, Query>, res, next) => {
	req.page = isNullOrUndefined(req.query.page) ? 1 : Number(req.query.page);
	req.limit = isNullOrUndefined(req.query.limit) ? 10 : Number(req.query.limit);
	req.version = Math.max(1, isNullOrUndefined(req.query.version) ? 3 : Number(req.query.version));
	req.timestamp = Date.now();
	const { lang, token } = req.cookies as Cookies;

	try { if (!isNullOrUndefined(token)) {
		req.account = await db.querySingle<AuthToken>(`
			select AuthToken {
			    account: {
			        id,
			        image,
			        profile_shape,
			        status,
			        mod,
			        player: {
			            id, 
			            name,
			            points,
			            verifications: { name, level_id, placement, video_id },
			            records := (select .entries {
			                level: { name, level_id, placement },
			                time_format := (select to_str(.time, "FMHH24:MI:SS")),
			                time_ms := (select to_str(.time, "MS")),
			                video_id,
			                rank
			            } order by .level.placement),
			            unverified_records := (select .unverified_entries {
			                id,
			                level: { name, level_id, placement },
			                time_format := (select to_str(.time, "FMHH24:MI:SS")),
			                time_ms := (select to_str(.time, "MS")),
			                video_id,
			                status,
			                reason
			            } order by .level.placement),
			            rank,
			            device
			        },
			        youtube,
			        discord
			    }
			} filter .token = <str>$token and .expires > <datetime>datetime_of_statement() limit 1
		`, { token }).then(res => res?.account);
	} }
	finally {
		// ensure renderPage will always be defined
		res.renderPage = async function(template: string, data: { [key: string | number]: unknown } = {}) {
			const translation = translations[lang ?? "en"];

			if (req.account) data.account = req.account;

			if (template.startsWith("/")) template = template.slice(1);
			res.send(nj.render(`${template}.html`, { translation, ...data }));
		};

		next();
	}
});

export default app;
