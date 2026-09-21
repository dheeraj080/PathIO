package com.path.pathio.analytics;

import com.path.pathio.repository.ClickHouseRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnalyticsConsumer {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsConsumer.class);
    private static final String CONSUMER_GROUP = "clickhouse_ingestor_group";
    private static final String CONSUMER_NAME = "worker_node_1";
    private static final int BATCH_SIZE = 2000;

    private final StringRedisTemplate redisTemplate;
    private final ClickHouseRepository clickHouseRepository;

    public AnalyticsConsumer(StringRedisTemplate redisTemplate, ClickHouseRepository clickHouseRepository) {
        this.redisTemplate = redisTemplate;
        this.clickHouseRepository = clickHouseRepository;
    }

    @PostConstruct
    public void initGroup() {
        try {
            redisTemplate.opsForStream().createGroup(AnalyticsProducer.STREAM_KEY, CONSUMER_GROUP);
        } catch (Exception ignored) {
            // Group already exists
        }
    }

    @Scheduled(fixedDelay = 2000) // Runs every 2 seconds
    public void consumeAndBatchInsert() {
        List<MapRecord<String, Object, Object>> messages = redisTemplate.opsForStream().read(
                Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                StreamReadOptions.empty().count(BATCH_SIZE).block(Duration.ofMillis(500)),
                StreamOffset.create(AnalyticsProducer.STREAM_KEY, ReadOffset.lastConsumed())
        );

        if (messages == null || messages.isEmpty()) {
            return;
        }

        List<ClickEvent> batch = new ArrayList<>(messages.size());
        RecordId[] recordIds = new RecordId[messages.size()];

        for (int i = 0; i < messages.size(); i++) {
            MapRecord<String, Object, Object> record = messages.get(i);
            var map = record.getValue();

            ClickEvent event = new ClickEvent(
                    (String) map.get("shortCode"),
                    (String) map.get("ipHash"),
                    (String) map.get("userAgent"),
                    (String) map.get("referer"),
                    Instant.ofEpochMilli(Long.parseLong((String) map.get("timestamp")))
            );
            batch.add(event);
            recordIds[i] = record.getId();
        }

        try {
            // 1. Bulk insert to ClickHouse
            clickHouseRepository.batchInsert(batch);

            // 2. Acknowledge messages in Redis Stream to prevent reprocessing
            redisTemplate.opsForStream().acknowledge(AnalyticsProducer.STREAM_KEY, CONSUMER_GROUP, recordIds);
            log.info("Successfully ingested {} analytics events into ClickHouse.", batch.size());
        } catch (Exception e) {
            log.error("Failed to insert analytics batch to ClickHouse", e);
        }
    }
}
