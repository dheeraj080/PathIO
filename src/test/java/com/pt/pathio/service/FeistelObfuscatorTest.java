package com.pt.pathio.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Headless tests for {@link FeistelObfuscator} (IDG-02). The obfuscator is a bijection over the
 * 40-bit ID space; injectivity is what guarantees that two distinct IDs can never be encoded into
 * the same short code.
 */
class FeistelObfuscatorTest {

    private static final long FORTY_BIT_MAX = (1L << 40) - 1;

    private final FeistelObfuscator obfuscator = new FeistelObfuscator();

    @Test
    @DisplayName("Obfuscation is deterministic")
    void obfuscationIsDeterministic() {
        assertThat(obfuscator.obfuscate(123_456_789L))
                .isEqualTo(obfuscator.obfuscate(123_456_789L));
    }

    @Test
    @DisplayName("Distinct IDs map to distinct values inside the 40-bit space")
    void obfuscationIsInjective() {
        Set<Long> seen = new HashSet<>();
        for (long id = 1; id <= 200_000; id++) {
            long obfuscated = obfuscator.obfuscate(id);
            assertThat(obfuscated).isBetween(0L, FORTY_BIT_MAX);
            assertThat(seen.add(obfuscated))
                    .as("collision on obfuscated value for id %d", id)
                    .isTrue();
        }
        assertThat(seen).hasSize(200_000);
    }

    @Test
    @DisplayName("Values stay within the 40-bit envelope at the ceiling")
    void masksToFortyBitsAtCeiling() {
        assertThat(obfuscator.obfuscate(FORTY_BIT_MAX)).isBetween(0L, FORTY_BIT_MAX);
        assertThat(obfuscator.obfuscate(FORTY_BIT_MAX - 1)).isBetween(0L, FORTY_BIT_MAX);
        assertThat(obfuscator.obfuscate(FORTY_BIT_MAX)).isNotEqualTo(obfuscator.obfuscate(FORTY_BIT_MAX - 1));
    }
}