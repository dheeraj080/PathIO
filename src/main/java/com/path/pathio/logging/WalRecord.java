package com.path.pathio.logging;
    
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;

public record WalRecord(long lsn, byte opType, String key, String value) {

    public static final byte OP_PUT = 1;
    public static final byte OP_DELETE = 2;

    public byte[] serialize() {
        byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
        byte[] valBytes = (value != null) ? value.getBytes(StandardCharsets.UTF_8) : new byte[0];

        // Size: LSN(8) + CRC(4) + OpType(1) + KeyLen(4) + ValLen(4) + Key + Val
        int bodySize = 1 + 4 + 4 + keyBytes.length + valBytes.length;
        int totalSize = 8 + 4 + bodySize;

        ByteBuffer buffer = ByteBuffer.allocate(totalSize);
        buffer.putLong(lsn);

        // Reserve 4 bytes for CRC
        int crcPosition = buffer.position();
        buffer.putInt(0);

        buffer.put(opType);
        buffer.putInt(keyBytes.length);
        buffer.putInt(valBytes.length);
        buffer.put(keyBytes);
        buffer.put(valBytes);

        // Compute CRC32 checksum over the body payload
        CRC32 crc = new CRC32();
        crc.update(buffer.array(), 12, bodySize);
        long checksum = crc.getValue();

        // Write CRC back into reserved slot
        buffer.putInt(crcPosition, (int) checksum);

        return buffer.array();
    }

    public static WalRecord deserialize(ByteBuffer buffer) {
        if (buffer.remaining() < 21) return null; // Minimum header size

        long lsn = buffer.getLong();
        int storedCrc = buffer.getInt();

        int bodyStart = buffer.position();
        byte opType = buffer.get();
        int keyLen = buffer.getInt();
        int valLen = buffer.getInt();

        if (buffer.remaining() < keyLen + valLen) {
            return null; // Corrupted / Truncated record
        }

        byte[] keyBytes = new byte[keyLen];
        buffer.get(keyBytes);
        String key = new String(keyBytes, StandardCharsets.UTF_8);

        byte[] valBytes = new byte[valLen];
        buffer.get(valBytes);
        String value = valLen > 0 ? new String(valBytes, StandardCharsets.UTF_8) : null;

        // Verify CRC Checksum
        int bodyLength = 1 + 4 + 4 + keyLen + valLen;
        CRC32 crc = new CRC32();
        crc.update(buffer.array(), buffer.arrayOffset() + bodyStart, bodyLength);

        if ((int) crc.getValue() != storedCrc) {
            throw new IllegalStateException("CRC checksum mismatch! Corrupted WAL record at LSN: " + lsn);
        }

        return new WalRecord(lsn, opType, key, value);
    }
}
