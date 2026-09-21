package com.path.pathio.keygen;

import com.path.pathio.repository.SegmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.locks.ReentrantLock;

@Service
public class KeyGeneratorService {

    private final SegmentRepository segmentRepository;
    private final FeistelCipher feistelCipher;
    private final Base62Encoder base62Encoder;
    private final int segmentSize;

    private volatile Segment currentSegment;
    private final ReentrantLock lock = new ReentrantLock();

    public KeyGeneratorService(
            SegmentRepository segmentRepository,
            FeistelCipher feistelCipher,
            Base62Encoder base62Encoder,
            @Value("${app.keygen.segment-size:100000}") int segmentSize) {
        this.segmentRepository = segmentRepository;
        this.feistelCipher = feistelCipher;
        this.base62Encoder = base62Encoder;
        this.segmentSize = segmentSize;
    }

    /**
     * Generates a non-sequential, guaranteed-unique short key.
     * Lock-free atomic operation under normal execution.
     */
    public String generateKey() {
        long seqId = getNextSequentialId();
        long obfuscatedId = feistelCipher.obfuscate(seqId);
        return base62Encoder.encode(obfuscatedId);
    }

    private long getNextSequentialId() {
        if (currentSegment == null || currentSegment.isExhausted()) {
            allocateNewSegment();
        }

        long id = currentSegment.getAndIncrement();
        if (id == -1) {
            // Segment ran out right between checks; attempt allocation
            allocateNewSegment();
            id = currentSegment.getAndIncrement();
        }
        return id;
    }

    private void allocateNewSegment() {
        lock.lock();
        try {
            if (currentSegment == null || currentSegment.isExhausted()) {
                SegmentRepository.SegmentRange range = segmentRepository.fetchNextSegment("url-shortener", segmentSize);
                this.currentSegment = new Segment(range.startId(), range.endId());
            }
        } finally {
            lock.unlock();
        }
    }
}
