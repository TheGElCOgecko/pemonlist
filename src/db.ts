import { createClient } from "edgedb";
import { Client } from "edgedb/dist/baseClient";
import type { QueryArgs } from "edgedb/dist/ifaces";

import { isNullOrUndefined } from "./util";

export * as schema from "../dbschema/interfaces";

export const db = createClient();

export enum QueryType {
    query = "query",
    querySingle = "querySingle",
    queryRequired = "queryRequired",
    queryRequiredSingle = "queryRequiredSingle"
}

export class CacheIdentifier {
    constructor(public query: string, public type: QueryType, public args: QueryArgs) {}
    static from(query: string, type: QueryType, args?: QueryArgs) {
        return new CacheIdentifier(query, type, args ?? null);
    }

    toHash(): string {
        return new Bun.CryptoHasher("md5").update(JSON.stringify({
            query: this.query,
            type: this.type,
            args: this.args,
        })).digest("hex");
    }
}

export class CacheBlock {
    constructor(public data: unknown, public expires: number, public serveStaleContent: boolean) {}
    static from(data: unknown, expires: number, serveStaleContent: boolean) {
        return new CacheBlock(data, expires, serveStaleContent);
    }
}

export const cache = new Map<string, CacheBlock>();

/**
 * When serving cached content, if serveStaleContent is true, the cache will be revalidated after being served.
 *
 * This removes the need for a validation option, and keeps the cache always up to date.
 *
 * If you want revalidation but don't want to serve stale content, caching will only use up extra memory.
 */
export type CacheOptions = {
    serveStaleContent?: boolean,
    timeToLive?: number | Date
};

declare module "edgedb" {
    interface Client {
        _query(type: QueryType, query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<unknown>

        cachedQuery<T = unknown>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<T[]>;
        cachedQueryJSON(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string>;

        cachedQuerySingle<T = unknown>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<T | null>;
        cachedQuerySingleJSON(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string>;

        cachedQueryRequired<T = unknown>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<[T, ...T[]]>;
        cachedQueryRequiredJSON(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string>;

        cachedQueryRequiredSingle<T = unknown>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<T>;
        cachedQueryRequiredSingleJSON(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string>;
    }
}

Client.prototype._query = async function(type: QueryType, query: string, args: QueryArgs, cacheOptions: CacheOptions = { serveStaleContent: false, timeToLive: 3600e3 }): Promise<unknown> {
    let { serveStaleContent, timeToLive } = cacheOptions;
    if (typeof serveStaleContent === "undefined") serveStaleContent = false;
    if (typeof timeToLive === "undefined") timeToLive = 3600e3;
    if (typeof args === "undefined") args = null;

    if (typeof timeToLive === "object") timeToLive = timeToLive.getTime() - Date.now();
    if (timeToLive < 0) timeToLive = 0;

    const identifier = CacheIdentifier.from(query, type, args);
    const cachedBlock = cache.get(identifier.toHash());

    if (!isNullOrUndefined(cachedBlock)) {
        if (cachedBlock!.expires > Date.now()) {
            if (serveStaleContent) {
                try { return cachedBlock!.data; }
                finally {
                    const data = await db[type](query, args);
                    cache.set(identifier.toHash(), CacheBlock.from(data, Date.now() + timeToLive, serveStaleContent));
                }
            }

            return cachedBlock!.data;
        }

        if (serveStaleContent) {
            try { return cachedBlock!.data; }
            finally {
                const data = await db[type](query, args);
                cache.set(identifier.toHash(), CacheBlock.from(data, Date.now() + timeToLive, serveStaleContent));
            }
        }

        cache.delete(identifier.toHash());
    }

    const data = await db[type](query, args);
    try { return data; }
    finally {
        cache.set(identifier.toHash(), CacheBlock.from(data, Date.now() + timeToLive, serveStaleContent));
    }
};

Client.prototype.cachedQuery = async function<T>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<T[]> {
    return await this._query(QueryType.query, query, args, cacheOptions) as T[];
};

Client.prototype.cachedQueryJSON = async function(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string> {
    return JSON.stringify(await this.cachedQuery(query, args, cacheOptions));
};

Client.prototype.cachedQuerySingle = async function<T>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<T | null> {
    return await this._query(QueryType.querySingle, query, args, cacheOptions) as T | null;
};

Client.prototype.cachedQuerySingleJSON = async function(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string> {
    return JSON.stringify(await this.cachedQuerySingle(query, args, cacheOptions));
};

Client.prototype.cachedQueryRequired = async function<T>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<[T, ...T[]]> {
    return await this._query(QueryType.queryRequired, query, args, cacheOptions) as [T, ...T[]];
};

Client.prototype.cachedQueryRequiredJSON = async function(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string> {
    return JSON.stringify(await this.cachedQueryRequired(query, args, cacheOptions));
};

Client.prototype.cachedQueryRequiredSingle = async function<T>(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<T> {
    return await this._query(QueryType.queryRequiredSingle, query, args, cacheOptions) as T;
};

Client.prototype.cachedQueryRequiredSingleJSON = async function(query: string, args?: QueryArgs, cacheOptions?: CacheOptions): Promise<string> {
    return JSON.stringify(await this.cachedQueryRequiredSingle(query, args, cacheOptions));
};

export default db;
