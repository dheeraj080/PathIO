package com.path.pathio.keygen;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FeistelCipher {

    // 40 bits total: 20 bits left half, 20 bits right half
    private static final int HALF_BITS = 20;
    private static final long HALF_MASK = (1L << HALF_BITS) - 1; // 0xFFFFF (1,048,575)
    private static final int ROUNDS = 4;

    // Keys generated via Spring configuration
    private final long[] roundKeys;

    public FeistelCipher(@Value("${app.keygen.secret-key:987654321}") long masterKey) {
        this.roundKeys = generateRoundKeys(masterKey);
    }

    /**
     * Obfuscates a 40-bit sequential integer ID into a 40-bit pseudo-random ID.
     */
    public long obfuscate(long inputId) {
        if (inputId < 0 || inputId >= (1L << (HALF_BITS * 2))) {
            throw new IllegalArgumentException("Input ID out of 40-bit bounds: " + inputId);
        }

        long left = (inputId >> HALF_BITS) & HALF_MASK;
        long right = inputId & HALF_MASK;

        for (int i = 0; i < ROUNDS; i++) {
            long newLeft = right;
            long newRight = left ^ fFunction(right, roundKeys[i]);
            left = newLeft;
            right = newRight;
        }

        // Combine left and right back into a 40-bit value
        return (left << HALF_BITS) | right;
    }

    /**
     * Reverses the obfuscation back to the sequential ID.
     */
    public long deobfuscate(long obfuscatedId) {
        long left = (obfuscatedId >> HALF_BITS) & HALF_MASK;
        long right = obfuscatedId & HALF_MASK;

        for (int i = ROUNDS - 1; i >= 0; i--) {
            long newRight = left;
            long newLeft = right ^ fFunction(left, roundKeys[i]);
            left = newLeft;
            right = newRight;
        }

        return (left << HALF_BITS) | right;
    }

    private long fFunction(long val, long key) {
        // MurmurHash3-inspired 32-bit mixing function constrained to 20 bits
        long hash = (val ^ key) * 0xcc9e2d51L;
        hash = Long.rotateLeft(hash, 15);
        hash *= 0x1b873593L;
        return hash & HALF_MASK;
    }

    private long[] generateRoundKeys(long masterKey) {
        long[] keys = new long[ROUNDS];
        for (int i = 0; i < ROUNDS; i++) {
            keys[i] = (masterKey ^ (i * 0x9e3779b97f4a7c15L)) & HALF_MASK;
        }
        return keys;
    }
}
