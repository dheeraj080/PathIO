package com.pt.pathio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "com.pt.pathio.repository")
@EnableCaching
@EnableAsync
@EnableScheduling
public class PathioApplication {

    public static void main(String[] args) {
        SpringApplication.run(PathioApplication.class, args);
    }

}
