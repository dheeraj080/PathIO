import http from 'k6/http';
import { check } from 'k6';

export const options = {
    // Fix 1: Correct k6 setting to disable following redirects globally
    maxRedirects: 0,
    scenarios: {
        cache_hits: {
            executor: 'constant-arrival-rate',
            rate: 1000,
            timeUnit: '1s',
            duration: '20s',
            preAllocatedVUs: 100, // Fix 2: Increased VUs to prevent iteration drops
            maxVUs: 200,
            exec: 'testCacheHits',
        },
        cache_misses: {
            executor: 'constant-arrival-rate',
            rate: 1000,
            timeUnit: '1s',
            startTime: '25s',
            duration: '20s',
            preAllocatedVUs: 100,
            maxVUs: 200,
            exec: 'testCacheMisses',
        },
    },
};

export function setup() {
    const keys = [];
    const params = { headers: { 'Content-Type': 'application/json' } };

    for (let i = 0; i < 5; i++) {
        const res = http.post(
            'http://localhost:8080/api/v1/shorten',
            JSON.stringify({ url: `https://example.com/item-${i}` }),
            params
        );
        if (res.status === 201) {
            keys.push(JSON.parse(res.body).key);
        }
    }
    return { hitKeys: keys };
}

export function testCacheHits(data) {
    const key = data.hitKeys[Math.floor(Math.random() * data.hitKeys.length)];
    // Fix 3: Standardized tag name to avoid high cardinality warnings
    const res = http.get(`http://localhost:8080/${key}`, { tags: { name: 'GET_CacheHit' } });

    check(res, { 'HIT status 302': (r) => r.status === 302 });
}

export function testCacheMisses() {
    const dummyKey = Math.random().toString(36).substring(2, 9);
    const res = http.get(`http://localhost:8080/${dummyKey}`, { tags: { name: 'GET_CacheMiss' } });

    check(res, { 'MISS status 404': (r) => r.status === 404 });
}