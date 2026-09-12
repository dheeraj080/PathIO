package org.path.link;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class Encoder {

    private static final char[] BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toCharArray();

    // Must be an ODD number within 41 bits to have a modular multiplicative inverse
    private static final long MULTIPLIER = 1099511627791L;
    private static final long MASK_41_BIT = (1L << 41) - 1;

    /**
     * Bijective (1-to-1) mapping within the 41-bit space.
     * Guarantees 0 collisions while scattering sequential IDs into pseudo-random outputs.
     */
    public String encode(long id) {
        long scrambled = scramble(id & MASK_41_BIT);
        return toBase62(scrambled);
    }

    private long scramble(long x) {
        // Step 1: XOR with a fixed bitmask (scramble bits)
        x ^= 0x5A5A5A5A5A5L;

        // Step 2: Bijective linear multiplication modulo 2^41
        x = (x * MULTIPLIER) & MASK_41_BIT;

        // Step 3: Bit-reversal shift (mix high and low bits)
        x = ((x >>> 20) | (x << 21)) & MASK_41_BIT;

        return x;
    }

    private String toBase62(long value) {
        char[] buf = new char[7];
        int charPos = 7;

        for (int i = 0; i < 7; i++) {
            buf[--charPos] = BASE62[(int) (value % 62)];
            value /= 62;
        }

        return new String(buf);
    }
}