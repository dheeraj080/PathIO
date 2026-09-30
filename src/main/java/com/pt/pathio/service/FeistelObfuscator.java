package com.pt.pathio.service;

import org.springframework.stereotype.Component;

@Component
public class FeistelObfuscator {

    private static final int ROUNDS = 4;

    private static final long MASK = 0xFFFFF;

    private static final int[] ROUND_KEYS = {0xA24A3, 0x5C1B7, 0x93E21, 0x1F8D5};

    public long obfuscate(long inputId) {
        long maskedInput = inputId & 0xFFFFFFFFFFL;
        long L = (maskedInput >> 20) & MASK;
        long R = maskedInput & MASK;

        for (int i = 0; i < ROUNDS; i++) {
            long temp = R;
            R = L ^ roundFunction(R, ROUND_KEYS[i]);
            L = temp;
        }

        return (L << 20) | (R & MASK);
    }

    private long roundFunction(long r, int roundKey) {
        long result = (r * 39719 + roundKey) ^ (r >> 5);
        return result & MASK;
    }
}