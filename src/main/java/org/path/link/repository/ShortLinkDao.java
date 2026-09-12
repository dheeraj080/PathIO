package org.path.link.repository;

import com.datastax.oss.driver.api.mapper.annotations.Dao;
import com.datastax.oss.driver.api.mapper.annotations.Insert;
import com.datastax.oss.driver.api.mapper.annotations.Select;
import org.path.link.model.ShortLink;

import java.util.Optional;

@Dao
public interface ShortLinkDao {
    @Select
    Optional<ShortLink> findByCode(String shortCode);

    @Insert
    void save(ShortLink shortLink);
}

