package com.path.pathio.logging;

import java.io.File;
import java.io.RandomAccessFile;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class WriteAheadLog implements AutoCloseable {

    private final File walFile;
    private final FileChannel channel;
    private final AtomicLong lsnCounter = new AtomicLong(0);
    private final ReentrantLock appendLock = new ReentrantLock();

    public WriteAheadLog(String path) throws IOException {
        this.walFile = new File(path);
        boolean isNew = !walFile.exists();

        RandomAccessFile raf = new RandomAccessFile(walFile, "rw");
        this.channel = raf.getChannel();

        if (!isNew && channel.size() > 0) {
            // Seek to the end of the log for appends
            channel.position(channel.size());
        }
    }

    /**
     * Appends an entry to the WAL and flushes to physical disk (`fsync`).
     */
    public long append(byte opType, String key, String value) throws IOException {
        appendLock.lock();
        try {
            long lsn = lsnCounter.incrementAndGet();
            WalRecord record = new WalRecord(lsn, opType, key, value);
            byte[] bytes = record.serialize();

            ByteBuffer buffer = ByteBuffer.wrap(bytes);
            while (buffer.hasRemaining()) {
                channel.write(buffer);
            }

            // CRITICAL: Force OS page cache flush to disk controller
            channel.force(true);

            return lsn;
        } finally {
            appendLock.unlock();
        }
    }

    public FileChannel getChannel() {
        return channel;
    }

    @Override
    public void close() throws IOException {
        if (channel != null && channel.isOpen()) {
            channel.force(true);
            channel.close();
        }
    }
}
