package com.loopdeck;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LoopDeckApplication {
    public static void main(String[] args) {
        SpringApplication.run(LoopDeckApplication.class, args);
    }
}
