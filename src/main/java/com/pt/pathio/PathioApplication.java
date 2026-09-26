package com.pt.pathio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "com.pt.pathio.repository")
public class PathioApplication {

    public static void main(String[] args) {
        SpringApplication.run(PathioApplication.class, args);
    }

}
