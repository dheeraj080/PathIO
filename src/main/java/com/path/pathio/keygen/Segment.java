package com.path.pathio.keygen;

import java.util.concurrent.atomic.AtomicLong;

public class Segment {
    private final long maxId;
    private final AtomicLong currentId;

    public Segment(long startId, long maxId) {
        this.maxId = maxId;
        this.currentId = new AtomicLong(startId);
    }

    public long getAndIncrement() {
        long next = currentId.getAndIncrement();
        return (next > maxId) ? -1 : next;
    }

    public boolean isExhausted() {
        return currentId.get() > maxId;
    }
}
