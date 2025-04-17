import { randomBytes } from "crypto";
import type { Request } from "express";
import * as googleapis from "google-auth-library";

import app from "../app";
import db from "../db";
import { isNullOrUndefined } from "../util";

const oauth2Client = new googleapis.OAuth2Client(
	process.env.GOOGLE_OAUTH2_CLIENT_ID,
	process.env.GOOGLE_OAUTH2_CLIENT_SECRET
);

export interface Oauth2 {
	code: string
}

app.get("/api/auth/google", async (req: Request<unknown, unknown, unknown, Oauth2>, res) => {
	const redirect = `${req.protocol}://${req.get("host")}/api/auth/google`;
	const authUrl = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: "email",
		redirect_uri: redirect
	});

	const { code } = req.query;

	if (isNullOrUndefined(code))
		return res.redirect(authUrl);

	const token = await oauth2Client.getToken({
		code,
		redirect_uri: redirect
	}).catch(() => undefined);
	if (isNullOrUndefined(token)) return res.redirect(authUrl);

	const ticket = await oauth2Client.verifyIdToken({
		idToken: token!.tokens.id_token!,
		audience: process.env.GOOGLE_OAUTH2_CLIENT_ID
	}).catch(() => undefined);
	if (isNullOrUndefined(ticket)) return res.redirect(authUrl);

	const payload = ticket!.getPayload();
	if (isNullOrUndefined(payload) || !(payload!.email_verified ?? false) || isNullOrUndefined(payload!.email ?? ""))
		return res.redirect(authUrl);

	const randomToken = randomBytes(100)
		.toString("base64")
		.replace(/\+|\/|=/g, "")
		.substring(0, 64);

	await db.execute(`
		insert AuthToken {
		    token := <str>$token,
		    account := (
				insert Account {
					email :=  <str>$email,
					oauth2 :=  <str>$oauth,
					player := <default::Player>{}
				} unless conflict on .email else (select Account)
		    )
		}
	`, {
		email: payload!.email,
		oauth: req.query.code,
		token: randomToken
	});

	res.cookie("token", randomToken, {
		maxAge: 1000 * 60 * 60 * 24 * 7,
		httpOnly: true
	});

	res.redirect("/account");
});
