package com.path.pathio.logging;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class StorageEngine {

    private final Map<String, String> memTable = new ConcurrentHashMap<>();
    private final WriteAheadLog wal;

    public StorageEngine(String walPath) throws IOException {
        this.wal = new WriteAheadLog(walPath);
        // Step 1: Execute Recovery on Engine Startup
        recover();
    }

    /**
     * Write Path: 1. WAL append + fsync -> 2. In-memory state mutation
     */
    public void put(String key, String value) throws IOException {
        wal.append(WalRecord.OP_PUT, key, value);
        memTable.put(key, value); // Applied only after disk commit
    }

    public void delete(String key) throws IOException {
        wal.append(WalRecord.OP_DELETE, key, null);
        memTable.remove(key);
    }

    public String get(String key) {
        return memTable.get(key);
    }

    /**
     * Recovery Phase: Scans the WAL sequentially and replays operations into state.
     */
    private void recover() throws IOException {
        FileChannel channel = wal.getChannel();
        if (channel.size() == 0) return;

        channel.position(0);
        ByteBuffer buffer = ByteBuffer.allocate((int) channel.size());
        channel.read(buffer);
        buffer.flip();

        long recoveredCount = 0;
        while (buffer.hasRemaining()) {
            try {
                WalRecord record = WalRecord.deserialize(buffer);
                if (record == null) break;

                if (record.opType() == WalRecord.OP_PUT) {
                    memTable.put(record.key(), record.value());
                } else if (record.opType() == WalRecord.OP_DELETE) {
                    memTable.remove(record.key());
                }
                recoveredCount++;
            } catch (Exception e) {
                System.err.println("Truncated or partial write encountered at offset "
                        + buffer.position() + ". Halting recovery replay.");
                break;
            }
        }
        System.out.println("Recovery complete. Replayed " + recoveredCount + " records successfully.");
    }
}
