package org.path.link;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class SnowflakeIdGenerator {

    // Custom Epoch: Jan 1, 2026 00:00:00 UTC (in milliseconds)
    private static final long CUSTOM_EPOCH_MS = 1767225600000L;

    private static final long NODE_ID_BITS = 5L;     // Max 31 Nodes
    private static final long SEQUENCE_BITS = 12L;   // Max 4095 IDs per millisecond

    private static final long MAX_NODE_ID = ~(-1L << NODE_ID_BITS);
    private static final long MAX_SEQUENCE = ~(-1L << SEQUENCE_BITS);

    private final long nodeId;
    private long lastTimestampMs = -1L;
    private long sequence = 0L;

    @Inject
    public SnowflakeIdGenerator(@ConfigProperty(name = "snowflake.node-id", defaultValue = "1") long nodeId) {
        if (nodeId < 0 || nodeId > MAX_NODE_ID) {
            throw new IllegalArgumentException("Node ID out of range [0, " + MAX_NODE_ID + "]");
        }
        this.nodeId = nodeId;
    }

    public synchronized long nextId() {
        long currentMs = System.currentTimeMillis();

        if (currentMs < lastTimestampMs) {
            throw new IllegalStateException("Clock moved backwards. Refusing to generate ID");
        }

        if (currentMs == lastTimestampMs) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                // Exhausted 4096 keys in 1 millisecond; wait for next millisecond (~1 ms wait)
                while (currentMs <= lastTimestampMs) {
                    Thread.onSpinWait();
                    currentMs = System.currentTimeMillis();
                }
            }
        } else {
            sequence = 0L;
        }

        lastTimestampMs = currentMs;

        return ((currentMs - CUSTOM_EPOCH_MS) << (NODE_ID_BITS + SEQUENCE_BITS))
                | (nodeId << SEQUENCE_BITS)
                | sequence;
    }
}