package org.path.redirect;

import java.io.Serializable;

// Immutable projection cached in memory / Redis
public record ShortLinkReadModel(String key, String originalUrl) implements Serializable {

}