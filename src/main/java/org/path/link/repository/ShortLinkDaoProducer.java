package org.path.link.repository; // Or your producer package

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import com.datastax.oss.driver.api.core.CqlSession;


@ApplicationScoped
public class ShortLinkDaoProducer {

    @Inject
    CqlSession cqlSession;

    @Produces
    @ApplicationScoped
    public ShortLinkMapper produceShortLinkMapper() {
        return new ShortLinkMapperBuilder(cqlSession).build();
    }
}