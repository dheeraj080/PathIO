package com.path.pathio.analytics;

import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AnalyticsProducer {

    public static final String STREAM_KEY = "stream:click_events";
    private final StringRedisTemplate redisTemplate;

    public AnalyticsProducer(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void publishEvent(ClickEvent event) {
        Map<String, String> body = Map.of(
                "shortCode", event.shortCode(),
                "ipHash", event.ipHash() != null ? event.ipHash() : "",
                "userAgent", event.userAgent() != null ? event.userAgent() : "",
                "referer", event.referer() != null ? event.referer() : "",
                "timestamp", String.valueOf(event.timestamp().toEpochMilli())
        );

        MapRecord<String, String, String> record = StreamRecords.newRecord()
                .in(STREAM_KEY)
                .ofMap(body);

        redisTemplate.opsForStream().add(record);
    }
}
