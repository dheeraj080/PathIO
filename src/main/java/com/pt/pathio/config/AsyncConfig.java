package com.pt.pathio.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Bounded execution for the asynchronous click pipeline and the scheduled analytics flush.
 *
 * <p>Without an explicit executor, {@code @EnableAsync} falls back to Spring's
 * {@code SimpleAsyncTaskExecutor}, which creates an unbounded thread per task. A redirect burst
 * would then spawn one thread per click event and can exhaust the JVM (RED-04). A fixed pool with a
 * bounded queue and {@link ThreadPoolExecutor.CallerRunsPolicy} applies backpressure to the
 * (cheap, Redis-only) buffering step instead of failing it.</p>
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("sched-");
        scheduler.initialize();
        return scheduler;
    }
}