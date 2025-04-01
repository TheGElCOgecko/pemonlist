import "./routes/static";
import "./routes/account";
import "./routes/mod";
import "./routes/index";
import "./routes/submit";
import "./routes/discord";
import "./routes/google";
import "./routes/api";

import type { NextFunction, Request, Response } from "express";
import { STATUS_CODES } from "http";

import { app } from "./app";
import { isNullOrUndefined, sortObjectKeys } from "./util";

app.get("*fallback", (req, res) => {
    const { url } = req;
    if (url.startsWith("/api") && !url.startsWith("/api/docs")) {
            res.status(404).json(sortObjectKeys({
            "error": true,
            "code": "not_found"
        }));
        return;
    }

    const fallback = url.startsWith("/api") ? "/docs/fallback" : "/fallback";
    res.status(404).renderPage(fallback, { status: `404: ${STATUS_CODES[404]}` });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`${new Date().toLocaleTimeString()}:\n\n`, err);
    err.stack = err.stack?.replaceAll(__dirname, "src").replaceAll("\\", "/");

    const { url } = req;
    if (url.startsWith("/api") && !url.startsWith("/api/docs")) {
        res.status(500).json(sortObjectKeys({
            "error": true,
            "code": "fatal_err",
            "message": err.message
        }));
        return next();
    }

    const fallback = url.startsWith("/api") ? "/docs/fallback" : "/fallback";
    res.status(500).renderPage(fallback, { status: `500: ${STATUS_CODES[500]}`, error: err });

    next();
});

const port = !isNullOrUndefined(process.env.PORT) ? Number(process.env.PORT) : 8111;
app.listen(port, "0.0.0.0", () => {
    console.log(`Serving website at 0.0.0.0:${port}`);
});
