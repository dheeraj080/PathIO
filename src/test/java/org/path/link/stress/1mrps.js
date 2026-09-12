import http from 'k6/http';
import { check } from 'k6';

export const options = {
    maxRedirects: 0,
    stages: [
        { duration: '15s', target: 2000 },  // Warmup to ~120k RPM
        { duration: '15s', target: 8000 },  // Scale up to ~500k RPM
        { duration: '30s', target: 16667 }, // Reach 1M RPM target
    ],
};

export function setup() {
    const keys = [];
    const params = { headers: { 'Content-Type': 'application/json' } };

    for (let i = 0; i < 20; i++) {
        const res = http.post(
            'http://localhost:8080/api/v1/shorten',
            JSON.stringify({ url: `https://example.com/scale-test-${i}` }),
            params
        );
        if (res.status === 201) {
            keys.push(JSON.parse(res.body).key);
        }
    }
    return { hitKeys: keys };
}

export default function (data) {
    const key = data.hitKeys[Math.floor(Math.random() * data.hitKeys.length)];
    const res = http.get(`http://localhost:8080/${key}`);

    check(res, {
        'status is 302': (r) => r.status === 302,
    });
}