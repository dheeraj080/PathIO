package com.pt.pathio.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class UrlClickedEvent {

    private final String shortCode;
}
