package com.loopdeck.mapper;

import com.loopdeck.model.Note;
import com.loopdeck.service.CardService.CreateNoteRequest;
import com.loopdeck.service.CardService.UpdateNoteRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface NoteMapper {

    @Mapping(target = "noteType", expression = "java(req.noteType() != null ? req.noteType() : \"basic\")")
    @Mapping(target = "tags", expression = "java(req.tags() != null ? req.tags() : \"\")")
    Note toEntity(CreateNoteRequest req);

    void updateEntity(UpdateNoteRequest req, @MappingTarget Note note);
}
