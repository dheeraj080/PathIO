import http from 'k6/http';
import { check } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 50 },  // Ramp up to 50 concurrent users
        { duration: '30s', target: 200 }, // Hold 200 concurrent users for 30s
        { duration: '10s', target: 0 },   // Ramp down to 0
    ],
};

export default function () {
    const url = 'http://localhost:8080/api/v1/shorten';
    const payload = JSON.stringify({
        url: 'https://www.example.com/test-url-for-throughput',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);
    check(res, { 'status was 201': (r) => r.status === 201 });
}