package com.path.pathio.repository;

import com.path.pathio.analytics.ClickEvent;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;

@Repository
public class ClickHouseRepository {

    private final JdbcTemplate clickHouseJdbcTemplate;

    public ClickHouseRepository(@Qualifier("clickHouseJdbcTemplate") JdbcTemplate clickHouseJdbcTemplate) {
        this.clickHouseJdbcTemplate = clickHouseJdbcTemplate;
    }

    public void batchInsert(List<ClickEvent> events) {
        String sql = "INSERT INTO click_analytics (short_code, clicked_at, ip_hash, user_agent, referer) VALUES (?, ?, ?, ?, ?)";

        clickHouseJdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                ClickEvent event = events.get(i);
                ps.setString(1, event.shortCode());
                ps.setTimestamp(2, Timestamp.from(event.timestamp()));
                ps.setString(3, event.ipHash());
                ps.setString(4, event.userAgent());
                ps.setString(5, event.referer());
            }

            @Override
            public int getBatchSize() {
                return events.size();
            }
        });
    }
}
