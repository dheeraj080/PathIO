import http from 'k6/http';
import { check } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 50 },   // Ramp up to 50 VUs
        { duration: '30s', target: 200 },  // Hold 200 VUs
        { duration: '10s', target: 0 },    // Ramp down
    ],
};

export function setup() {
    const keys = [];
    const shortenUrl = 'http://localhost:8080/api/v1/shorten';
    const params = { headers: { 'Content-Type': 'application/json' } };

    console.log('Generating seed links for benchmark...');
    for (let i = 0; i < 50; i++) {
        const payload = JSON.stringify({ url: `https://example.com/test-page-${i}` });
        const res = http.post(shortenUrl, payload, params);

        if (res.status === 201) {
            const body = JSON.parse(res.body);
            keys.push(body.key);
        }
    }

    return { keys: keys };
}

export default function (data) {
    const randomKey = data.keys[Math.floor(Math.random() * data.keys.length)];
    const targetUrl = `http://localhost:8080/${randomKey}`;

    // maxRedirects: 0 stops k6 from making outbound calls to example.com
    const res = http.get(targetUrl, { redirects: 0 });

    check(res, {
        'status is 302': (r) => r.status === 302,
        'has location header': (r) => r.headers['Location'] !== undefined,
    });
}