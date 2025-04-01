/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RequestHandler } from "express";

export const isNullOrUndefined = (value: unknown) => {
    if (typeof value === "undefined") return true;
    if (value === null) return true;
    return false;
};

export const requireLogin: RequestHandler = async (req, res, next) => {
    if (isNullOrUndefined(req.account)) return res.redirect("/login");

    next();
};

export const requireMod: RequestHandler = async (req, res, next) => {
    if (isNullOrUndefined(req.account)) return res.redirect("/login");
    if (isNullOrUndefined(req.account!.mod)) return res.redirect("/account");

    next();
};

declare global {
    interface String {
        toCapital(): string;
    }
}

String.prototype.toCapital = function() {
    return this.replace(/(.)(?=.+)/, a => a.toUpperCase());
};

export function sortObjectKeys<T = Record<any, any>>(object: Record<any, any>, compareFn?: ((a: any, b: any) => number) | null, walkTree: boolean = true) {
    const keys = Object.keys(object).sort(!isNullOrUndefined(compareFn) ? compareFn! : undefined);
    const returnObject: Record<any, any> = {};

    for (const key of keys) {
        let value = object[key];
        if (
            !isNullOrUndefined(value) &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) value = sortObjectKeys<T>(value as Record<any, any>, compareFn, walkTree);

        returnObject[key] = value;
    }

    return returnObject as T;
}

const defaultSortFunction = (a: any, b: any) => {
    a = String(a);
    b = String(b);

    if ((a as string).length !== (b as string).length) return (a as string).length - (b as string).length;

    for (let i = 0; i < (a as string).length; i++) {
        if ((a as string).charCodeAt(i) === (b as string).charCodeAt(i)) continue;
        return (a as string).charCodeAt(i) - (b as string).charCodeAt(i);
    }

    return 0;
};

export function sortObjectValues<T = Record<any, any>>(object: Record<any, any>, compareFn?: ((a: any, b: any) => number) | null, walkTree: boolean = true) {
    const values: [number, any][] = Object.values(object).map((v, i) => ([i, v] as [number, any])).sort((a, b) => {
        if (!isNullOrUndefined(compareFn)) return compareFn!(a[1], b[1]);
        return defaultSortFunction(a[1], b[1]);
    });
    const returnObject: Record<any, any> = {};

    const keys = Object.keys(object);
    values.forEach(v => {
        let value = v[1];
        if (
            !isNullOrUndefined(value) &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) value = sortObjectValues<T>(value as Record<any, any>, compareFn, walkTree);

        returnObject[keys[v[0]]] = value;
    });

    return returnObject as T;
}
