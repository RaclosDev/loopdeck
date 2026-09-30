package com.loopdeck.mapper;

import com.loopdeck.model.Deck;
import com.loopdeck.service.DeckService.CreateDeckRequest;
import com.loopdeck.service.DeckService.UpdateDeckRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface DeckMapper {

    @Mapping(target = "name", expression = "java(req.name() != null ? req.name().trim() : null)")
    @Mapping(target = "description", expression = "java(req.description() != null ? req.description().trim() : \"\")")
    Deck toEntity(CreateDeckRequest req);

    @Mapping(target = "name", expression = "java(req.name() != null ? req.name().trim() : deck.getName())")
    @Mapping(target = "description", expression = "java(req.description() != null ? req.description().trim() : deck.getDescription())")
    void updateEntity(UpdateDeckRequest req, @MappingTarget Deck deck);
}
