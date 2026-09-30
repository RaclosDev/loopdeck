package com.loopdeck.mapper;

import com.loopdeck.model.User;
import com.loopdeck.service.AuthService.RegisterRequest;
import com.loopdeck.service.AuthService.UserDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
    
    @Mapping(target = "id", expression = "java(java.util.UUID.randomUUID().toString())")
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "googleId", ignore = true)
    @Mapping(target = "createdAt", expression = "java(java.time.Instant.now())")
    User toEntity(RegisterRequest request);
}
