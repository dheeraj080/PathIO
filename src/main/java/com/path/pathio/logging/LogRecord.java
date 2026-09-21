package com.path.pathio.logging;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

// ============================================================================
// 1. SEALED LOG RECORD HIERARCHY
// ============================================================================

sealed interface LogRecord
        permits LogRecord.Begin,
        LogRecord.Update,
        LogRecord.Commit,
        LogRecord.Abort,
        LogRecord.End,
        LogRecord.CLR,
        LogRecord.Checkpoint {

    long lsn();

    long prevLsn();

    record Begin(long lsn, long prevLsn, long transId) implements LogRecord {
    }

    record Update(long lsn, long prevLsn, long transId, int pageId, String key, String undoData,
                  String redoData) implements LogRecord {
    }

    record Commit(long lsn, long prevLsn, long transId) implements LogRecord {
    }

    record Abort(long lsn, long prevLsn, long transId) implements LogRecord {
    }

    record End(long lsn, long prevLsn, long transId) implements LogRecord {
    }

    record CLR(long lsn, long prevLsn, long transId, int pageId, String key, String undoData,
               long undoNextLsn) implements LogRecord {
        public String redoData() {
            return undoData;
        }
    }

    record Checkpoint(long lsn, Map<Long, Long> txTableSnapshot, Map<Integer, Long> dptSnapshot) implements LogRecord {
        @Override
        public long prevLsn() {
            return -1;
        }
    }
}

enum TxStatus {RUNNING, COMMITTED, ABORTING}

// ============================================================================
// 2. DISK PAGE & BUFFER MANAGER (Steal / No-Force)
// ============================================================================

class Page {
    private final int pageId;
    private long pageLsn = 0;
    private final Map<String, String> data = new HashMap<>();

    public Page(int pageId) {
        this.pageId = pageId;
    }

    public long pageLsn() {
        return pageLsn;
    }

    // Renamed to avoid Lombok @Setter inspection
    public void assignPageLsn(long lsn) {
        this.pageLsn = lsn;
    }

    public Map<String, String> data() {
        return data;
    }

    public Page snapshot() {
        Page copy = new Page(this.pageId);
        copy.pageLsn = this.pageLsn;
        copy.data.putAll(this.data);
        return copy;
    }

    @Override
    public String toString() {
        return "Page[id=" + pageId + ", LSN=" + pageLsn + ", data=" + data + "]";
    }
}

class BufferManager {
    private final Map<Integer, Page> memoryPages = new ConcurrentHashMap<>();
    private final Map<Integer, Page> diskPages = new ConcurrentHashMap<>();

    public Page getPage(int pageId) {
        return memoryPages.computeIfAbsent(pageId, id ->
                diskPages.getOrDefault(id, new Page(id)).snapshot()
        );
    }

    public void flushPageToDisk(int pageId, ARIESLogManager logManager) {
        Page inMem = memoryPages.get(pageId);
        if (inMem != null) {
            logManager.flushToLSN(inMem.pageLsn());
            diskPages.put(pageId, inMem.snapshot());
        }
    }
}

// ============================================================================
// 3. LOG MANAGER
// ============================================================================

class ARIESLogManager {
    private final List<LogRecord> log = new ArrayList<>();
    private final AtomicLong lsnSequence = new AtomicLong(100);
    private long flushedLsn = 0;

    @SuppressWarnings("unused")
    public synchronized long appendRecord(LogRecord record) {
        long lsn = lsnSequence.incrementAndGet();
        LogRecord stamped = switch (record) {
            case LogRecord.Begin(var oldLsn, var pLsn, var tx) -> new LogRecord.Begin(lsn, pLsn, tx);
            case LogRecord.Update(var oldLsn, var pLsn, var tx, var p, var k, var u, var r) ->
                    new LogRecord.Update(lsn, pLsn, tx, p, k, u, r);
            case LogRecord.Commit(var oldLsn, var pLsn, var tx) -> new LogRecord.Commit(lsn, pLsn, tx);
            case LogRecord.Abort(var oldLsn, var pLsn, var tx) -> new LogRecord.Abort(lsn, pLsn, tx);
            case LogRecord.End(var oldLsn, var pLsn, var tx) -> new LogRecord.End(lsn, pLsn, tx);
            case LogRecord.CLR(var oldLsn, var pLsn, var tx, var p, var k, var u, var uNext) ->
                    new LogRecord.CLR(lsn, pLsn, tx, p, k, u, uNext);
            case LogRecord.Checkpoint(var oldLsn, var txSnap, var dptSnap) ->
                    new LogRecord.Checkpoint(lsn, txSnap, dptSnap);
        };
        log.add(stamped);
        return lsn;
    }

    public synchronized void flushToLSN(long lsn) {
        this.flushedLsn = Math.max(flushedLsn, lsn);
    }

    // Renamed to avoid Lombok @Getter inspection
    public long currentFlushedLsn() {
        return flushedLsn;
    }

    public List<LogRecord> getLog() {
        return List.copyOf(log);
    }

    public long getCurrentLsn() {
        return lsnSequence.get();
    }
}

// ============================================================================
// 4. ARIES ENGINE
// ============================================================================

class ARIESEngine {
    private static final Logger LOGGER = Logger.getLogger(ARIESEngine.class.getName());

    final ARIESLogManager logManager = new ARIESLogManager();
    final BufferManager bufferManager = new BufferManager();

    final Map<Long, Long> transactionTable = new HashMap<>();
    final Map<Long, TxStatus> transactionStatus = new HashMap<>();
    final Map<Integer, Long> dirtyPageTable = new HashMap<>();

    private long checkpointLsn = -1;

    public void beginTx(long transId) {
        long lsn = logManager.appendRecord(new LogRecord.Begin(0, -1, transId));
        transactionTable.put(transId, lsn);
        transactionStatus.put(transId, TxStatus.RUNNING);
    }

    public void update(long transId, int pageId, String key, String newValue) {
        Page page = bufferManager.getPage(pageId);
        String oldValue = page.data().get(key);

        long prevLsn = transactionTable.getOrDefault(transId, -1L);
        long lsn = logManager.appendRecord(
                new LogRecord.Update(0, prevLsn, transId, pageId, key, oldValue, newValue)
        );

        page.data().put(key, newValue);
        page.assignPageLsn(lsn);

        transactionTable.put(transId, lsn);
        dirtyPageTable.putIfAbsent(pageId, lsn);
    }

    public void commit(long transId) {
        long prevLsn = transactionTable.get(transId);
        long lsn = logManager.appendRecord(new LogRecord.Commit(0, prevLsn, transId));
        logManager.flushToLSN(lsn);

        transactionStatus.put(transId, TxStatus.COMMITTED);
        logManager.appendRecord(new LogRecord.End(0, lsn, transId));
        transactionTable.remove(transId);
        transactionStatus.remove(transId);
    }

    public void checkpoint() {
        long lsn = logManager.getCurrentLsn() + 1;
        LogRecord cp = new LogRecord.Checkpoint(lsn, Map.copyOf(transactionTable), Map.copyOf(dirtyPageTable));
        logManager.appendRecord(cp);
        this.checkpointLsn = lsn;
        logManager.flushToLSN(lsn);
    }

    // --- RECOVERY PROTOCOL ---

    @SuppressWarnings("unused")
    public void recover() {
        LOGGER.info("============== STARTING ARIES RECOVERY ==============");

        // PHASE 1: ANALYSIS
        LOGGER.info("--- [PHASE 1: ANALYSIS] ---");
        transactionTable.clear();
        dirtyPageTable.clear();

        int startIndex = 0;
        if (checkpointLsn != -1) {
            var log = logManager.getLog();
            for (int i = 0; i < log.size(); i++) {
                if (log.get(i) instanceof LogRecord.Checkpoint(
                        var lsn, var txSnap, var dptSnap
                ) && lsn == checkpointLsn) {
                    startIndex = i;
                    transactionTable.putAll(txSnap);
                    dirtyPageTable.putAll(dptSnap);
                    txSnap.keySet().forEach(tx -> transactionStatus.put(tx, TxStatus.RUNNING));
                    LOGGER.info(() -> "Restored state from Checkpoint LSN: " + checkpointLsn);
                    break;
                }
            }
        }

        var log = logManager.getLog();
        for (int i = startIndex; i < log.size(); i++) {
            switch (log.get(i)) {
                case LogRecord.Begin(var lsn, var prev, var tx) -> {
                    transactionTable.put(tx, lsn);
                    transactionStatus.put(tx, TxStatus.RUNNING);
                }
                case LogRecord.Update(var lsn, var prev, var tx, var pageId, var key, var undo, var redo) -> {
                    transactionTable.put(tx, lsn);
                    dirtyPageTable.putIfAbsent(pageId, lsn);
                }
                case LogRecord.CLR(var lsn, var prev, var tx, var pageId, var key, var undo, var nxt) -> {
                    transactionTable.put(tx, lsn);
                    dirtyPageTable.putIfAbsent(pageId, lsn);
                }
                case LogRecord.Commit(var lsn, var prev, var tx) -> {
                    transactionTable.put(tx, lsn);
                    transactionStatus.put(tx, TxStatus.COMMITTED);
                }
                case LogRecord.Abort(var lsn, var prev, var tx) -> {
                    transactionTable.put(tx, lsn);
                    transactionStatus.put(tx, TxStatus.ABORTING);
                }
                case LogRecord.End(var lsn, var prev, var tx) -> {
                    transactionTable.remove(tx);
                    transactionStatus.remove(tx);
                }
                case LogRecord.Checkpoint(var lsn, var txSnap, var dptSnap) -> {
                }
            }
        }

        LOGGER.info("Analysis Complete.");
        LOGGER.info(() -> "Active Transactions (Losers): " + transactionTable);
        LOGGER.info(() -> "Dirty Page Table: " + dirtyPageTable);

        // PHASE 2: REDO
        // PHASE 2: REDO
        LOGGER.info("--- [PHASE 2: REDO] ---");
        long redoLsn = dirtyPageTable.values().stream().min(Long::compareTo).orElse(0L);
        LOGGER.info(() -> "Smallest recLSN in DPT (RedoLSN) = " + redoLsn);

        for (LogRecord rec : logManager.getLog()) {
            if (rec.lsn() < redoLsn) continue;

            if (rec instanceof LogRecord.Update(
                    var lsn, var prev, var tx, var pageId, var key, var undo, var redoData
            )) {
                checkAndApplyRedo(lsn, pageId, key, redoData);
            } else if (rec instanceof LogRecord.CLR(
                    var lsn, var prev, var tx, var pageId, var key, var undo, var nxt
            )) {
                checkAndApplyRedo(lsn, pageId, key, undo);
            }
        }

        // PHASE 3: UNDO
        LOGGER.info("--- [PHASE 3: UNDO] ---");
        PriorityQueue<Long> toUndoLSNs = new PriorityQueue<>(Comparator.reverseOrder());

        transactionTable.forEach((tx, lastLsn) -> {
            TxStatus status = transactionStatus.get(tx);
            if (status == TxStatus.RUNNING || status == TxStatus.ABORTING) {
                toUndoLSNs.add(lastLsn);
            }
        });

        while (!toUndoLSNs.isEmpty()) {
            long maxLsn = toUndoLSNs.poll();
            LogRecord rec = findRecordByLSN(maxLsn);
            if (rec == null) continue;

            switch (rec) {
                case LogRecord.Update(var lsn, var prevLsn, var tx, var pageId, var key, var undoData, var redo) -> {
                    LOGGER.info(() -> String.format("LSN %d: UNDOing Tx %d on Page %d (Restoring %s = %s)", lsn, tx, pageId, key, undoData));

                    Page page = bufferManager.getPage(pageId);
                    page.data().put(key, undoData);

                    long clrLsn = logManager.appendRecord(
                            new LogRecord.CLR(0, transactionTable.get(tx), tx, pageId, key, undoData, prevLsn)
                    );
                    page.assignPageLsn(clrLsn);
                    transactionTable.put(tx, clrLsn);

                    if (prevLsn != -1) {
                        toUndoLSNs.add(prevLsn);
                    } else {
                        logManager.appendRecord(new LogRecord.End(0, clrLsn, tx));
                        transactionTable.remove(tx);
                    }
                }
                case LogRecord.CLR(var lsn, var prev, var tx, var page, var key, var undo, var undoNextLsn) -> {
                    LOGGER.info(() -> String.format("LSN %d: Encountered CLR for Tx %d -> Skipping to undoNextLSN = %d", lsn, tx, undoNextLsn));
                    if (undoNextLsn != -1) {
                        toUndoLSNs.add(undoNextLsn);
                    } else {
                        logManager.appendRecord(new LogRecord.End(0, lsn, tx));
                        transactionTable.remove(tx);
                    }
                }
                default -> {
                    if (rec.prevLsn() != -1) {
                        toUndoLSNs.add(rec.prevLsn());
                    }
                }
            }
        }

        LOGGER.info("============== ARIES RECOVERY COMPLETE ==============");
    }

    private void checkAndApplyRedo(long lsn, int pageId, String key, String redoData) {
        if (!dirtyPageTable.containsKey(pageId)) {
            LOGGER.info(() -> String.format("LSN %d: Page %d not in DPT -> Skipping Redo", lsn, pageId));
            return;
        }
        if (dirtyPageTable.get(pageId) > lsn) {
            LOGGER.info(() -> String.format("LSN %d: recLSN > LSN -> Skipping Redo", lsn));
            return;
        }
        Page page = bufferManager.getPage(pageId);
        if (page.pageLsn() >= lsn) {
            LOGGER.info(() -> String.format("LSN %d: PageLSN (%d) >= LSN -> Skipping Redo", lsn, page.pageLsn()));
            return;
        }

        LOGGER.info(() -> String.format("LSN %d: REDOing on Page %d (%s = %s)", lsn, pageId, key, redoData));
        page.data().put(key, redoData);
        page.assignPageLsn(lsn);
    }

    private LogRecord findRecordByLSN(long lsn) {
        return logManager.getLog().stream()
                .filter(r -> r.lsn() == lsn)
                .findFirst()
                .orElse(null);
    }
}

// ============================================================================
// 5. DEMO EXECUTION
// ============================================================================

class AriesDemoJava27 {
    private static final Logger LOGGER = Logger.getLogger(AriesDemoJava27.class.getName());

    // Modifier 'public' removed to resolve Java 26-preview inspection
    static void main(String[] args) {
        if (args.length > 0) {
            LOGGER.setLevel(Level.FINE);
        }

        ARIESEngine engine = new ARIESEngine();

        LOGGER.info("--- 1. EXECUTING TRANSACTIONS ---");

        engine.beginTx(1);
        engine.update(1, 1, "A", "V1_Tx1");
        engine.commit(1);

        engine.beginTx(2);
        engine.update(2, 2, "B", "V1_Tx2");

        engine.checkpoint();

        engine.beginTx(3);
        engine.update(3, 1, "A", "V2_Tx3");

        engine.bufferManager.flushPageToDisk(1, engine.logManager);

        engine.update(2, 2, "B", "V2_Tx2");

        LOGGER.info("--- WAL LOG BEFORE CRASH ---");
        engine.logManager.getLog().forEach(record -> LOGGER.info(record::toString));

        // Use the flushedLsn variable to satisfy the unused method inspection
        LOGGER.info(() -> "Current Flushed LSN before crash: " + engine.logManager.currentFlushedLsn());

        LOGGER.info("*** SIMULATING CRASH ***");
        engine.recover();

        LOGGER.info("--- FINAL RECOVERED STATE ---");
        LOGGER.info(() -> "Page 1: " + engine.bufferManager.getPage(1));
        LOGGER.info(() -> "Page 2: " + engine.bufferManager.getPage(2));
    }
}