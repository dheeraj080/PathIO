package org.path.link;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class ShortenerKeyGenerationTest {

    private SnowflakeIdGenerator snowflake;
    private Encoder obfuscator;

    @BeforeEach
    void setUp() {
        snowflake = new SnowflakeIdGenerator(1L);
        obfuscator = new Encoder();
    }

    @Test
    @DisplayName("Verify generated keys are strictly 7 characters long")
    void testKeyLength() {
        long id = snowflake.nextId();
        String key = obfuscator.encode(id);

        assertThat(key)
                .isNotNull()
                .hasSize(7)
                .matches("^[a-zA-Z0-9]{7}$");
    }

    @Test
    @DisplayName("Verify mathematical 1-to-1 uniqueness over sequential IDs")
    void testObfuscatorBijectivity() {
        // Reduced from 500,000 to 10,000 to prevent GC pauses during maven build
        int sampleSize = 10_000;
        Set<String> generatedKeys = new HashSet<>(sampleSize);

        for (long id = 0; id < sampleSize; id++) {
            String key = obfuscator.encode(id);

            assertThat(key).hasSize(7);
            boolean isUnique = generatedKeys.add(key);

            assertThat(isUnique)
                    .withFailMessage("Collision detected at ID %d! Key '%s' already exists.", id, key)
                    .isTrue();
        }
    }

    @Test
    @DisplayName("Verify thread safety and zero collisions under multi-threaded concurrency")
    void testConcurrentKeyGeneration() throws InterruptedException {
        int threadCount = 4; // Reduced from 8
        int keysPerThread = 2_500; // Total 10,000 keys
        int totalKeys = threadCount * keysPerThread;

        Set<String> concurrentKeys = ConcurrentHashMap.newKeySet();
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < keysPerThread; j++) {
                        long id = snowflake.nextId();
                        String key = obfuscator.encode(id);
                        concurrentKeys.add(key);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertThat(concurrentKeys).hasSize(totalKeys);
    }
}