import { Action, Authenticator, makeCid } from "./index";
import fetch from 'cross-fetch';

export class S3 {
    constructor(
        private url: string,
        private orbitId: string,
        private auth: Authenticator,
    ) { }

    public get orbit(): string {
        return this.orbitId
    }

    public async get(key: string, authenticate: boolean = true, version?: string): Promise<Response> {
        return await fetch(makeContentPath(this.url, this.orbit, key, version), {
            method: "GET",
            headers: authenticate ? { ...await this.auth.content(this.orbit, [key], Action.get) } : undefined
        })
    }

    public async head(key: string, authenticate: boolean = true, version?: string): Promise<Response> {
        return await fetch(makeContentPath(this.url, this.orbit, key, version), {
            method: "HEAD",
            headers: authenticate ? { ...await this.auth.content(this.orbit, [key], Action.get) } : undefined
        })
    }

    public async put(key: string, value: Blob, metadata: { [key: string]: string }): Promise<Response> {
        const cid = await makeCid(new Uint8Array(await value.arrayBuffer()));
        const auth = await this.auth.content(this.orbit, [cid], Action.put)
        return await fetch(makeContentPath(this.url, this.orbit, key), {
            method: "PUT",
            body: value,
            headers: { ...auth, ...metadata }
        })
    }

    public async del(cid: string, version?: string): Promise<Response> {
        return await fetch(makeContentPath(this.url, this.orbit, cid, version), {
            method: 'DELETE',
            headers: await this.auth.content(this.orbit, [cid], Action.delete)
        })
    }

    public async list(): Promise<Response> {
        return await fetch(makeOrbitPath(this.url, this.orbit), { method: 'GET', headers: await this.auth.content(this.orbit, [], Action.list) })
    }
}

const makeOrbitPath = (url: string, orbit: string): string => url + "/" + orbit + "/s3"

const makeContentPath = (url: string, orbit: string, key: string, version?: string): string => makeOrbitPath(url, orbit) + "/" + key + (version ? `?version=${version}` : "")
