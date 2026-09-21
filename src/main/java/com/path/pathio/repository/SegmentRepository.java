package com.path.pathio.repository;

public interface SegmentRepository {
    /**
     * Atomically fetches the next available range from DB or Redis.
     * e.g., returns [1000000, 1100000]
     */
    SegmentRange fetchNextSegment(String serviceName, int segmentSize);

    record SegmentRange(long startId, long endId) {
    }
}
