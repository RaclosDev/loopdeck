package com.loopdeck.controller;

import com.loopdeck.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserDto> getMe(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }
}
