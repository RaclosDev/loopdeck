package com.loopdeck.controller;

import com.loopdeck.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SafeErrorsTest {
    @RestController static class TestEndpoints {
        @GetMapping("/invalid") String invalid() { throw new IllegalArgumentException("private-database-detail"); }
        @GetMapping("/number") int number(@RequestParam int page) { return page; }
        record Input(@jakarta.validation.constraints.NotBlank String name) {}
        @PostMapping("/body") String body(@jakarta.validation.Valid @RequestBody Input input) { return input.name(); }
    }
    @Test void inputFailuresAreBadRequestsWithoutInternalDetails() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new TestEndpoints()).setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/invalid")).andExpect(status().isBadRequest()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private-"))));
        mvc.perform(get("/number").param("page", "wrong")).andExpect(status().isBadRequest());
        mvc.perform(post("/body").contentType("application/json").content("{")).andExpect(status().isBadRequest());
        mvc.perform(post("/body").contentType("application/json").content("{\"name\":\"\"}")).andExpect(status().isBadRequest());
    }
}
