package org.path.link.repository; // Ensure this matches org.path.link

import com.datastax.oss.driver.api.mapper.annotations.DaoFactory;
import com.datastax.oss.driver.api.mapper.annotations.Mapper;

@Mapper
public interface ShortLinkMapper {
    @DaoFactory
    ShortLinkDao shortLinkDao();
}