import {type ClassValue, clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'
import {useClipboard} from '@vueuse/core'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function isEmptyObject(obj: any): boolean {
    if (!obj) {
        return true
    }
    return Object.keys(obj).length === 0
}

export function copyToClipboard(source: string): void {
    const {copy} = useClipboard({source})
    copy()
}

export function toJson(rows: Record<string, any>): string {
    function normalize(x: any): any {
        if (x === null || typeof x !== 'object') return x;
        if (!Array.isArray(x) && x.name !== undefined && x.value !== undefined) return normalize(x.value);
        if (Array.isArray(x)) {
            if (x.length > 0 && x[0] && x[0].name !== undefined && x[0].value !== undefined) {
                const o: Record<string, any> = {};
                for (const i of x) o[i.name] = normalize(i.value);
                return o;
            }
            return x.map(normalize);
        }
        const o: Record<string, any> = {};
        for (const k in x) {
            const v = x[k];
            if (v && typeof v === 'object' && v.name !== undefined && v.value !== undefined) {
                o[v.name] = normalize(v.value);
            } else {
                o[k] = normalize(v);
            }
        }
        return o;
    }
    return JSON.stringify(normalize(rows), null, 2);
}

export function bodyIsJson(payload: ResponseData | RequestData): boolean {
    if (!payload || !payload.headers || payload.headers['Content-Type'] === null) {
        return false;
    }

    const contentType = payload.headers['Content-Type'];
    let hasContentType = contentType ? /application\/json/g.test(contentType) : false;
    try {
        if (payload.body) {
            JSON.parse(payload.body);
        }
        return hasContentType;
    } catch (e) {
        return false;
    }
}

export function bodyIsHtml(payload: ResponseData | RequestData): boolean {
    if (!payload || !payload.headers || payload.headers['Content-Type'] === null) {
        return false;
    }

    const contentType = payload.headers['Content-Type'];

    return contentType ? /text\/html/g.test(contentType) : false;
}

export function openInNewTab(url: string): void {
    window.open(url, '_blank');
}

export function isDarwin(): boolean {
    return navigator.userAgent.indexOf('Mac OS X') !== -1;
}

export function isNestedStructure(obj: Record<string, any>): boolean {
    return Object.keys(obj).some(key => typeof obj[key] === 'object');
}
