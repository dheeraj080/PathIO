package com.pt.pathio.service;

import org.springframework.stereotype.Component;

@Component
public class FeistelObfuscator {

    private static final int ROUNDS = 4;

    // Adjusted to 40 total bits split into two 20-bit halves
    private static final long MASK = 0xFFFFF; // 20 bits (2^20 - 1)

    private static final int[] ROUND_KEYS = {0xA24A3, 0x5C1B7, 0x93E21, 0x1F8D5};

    public long obfuscate(long inputId) {
        // Ensure input fits within 40 bits, then split into Left (20 bits) and Right (20 bits)
        long maskedInput = inputId & 0xFFFFFFFFFFL;
        long L = (maskedInput >> 20) & MASK;
        long R = maskedInput & MASK;

        for (int i = 0; i < ROUNDS; i++) {
            long temp = R;
            R = L ^ roundFunction(R, ROUND_KEYS[i]);
            L = temp; // Both L and R now cleanly stay 20 bits
        }

        // Recombine into a 40-bit obfuscated ID (Max value ~1.09 trillion, well below 62^7)
        return (L << 20) | (R & MASK);
    }

    private long roundFunction(long r, int roundKey) {
        long result = (r * 39719 + roundKey) ^ (r >> 5);
        return result & MASK;
    }
}