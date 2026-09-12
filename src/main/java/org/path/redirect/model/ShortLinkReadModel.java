package org.path.redirect.model;

import java.io.Serializable;

// Immutable projection cached in memory / Redis
public record ShortLinkReadModel(String key, String originalUrl) implements Serializable {

}