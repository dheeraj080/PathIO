package org.path.redirect.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import org.path.link.service.ShortenerService;

import java.net.URI;

@Path("/")
public class RedirectResource {

    @Inject
    ShortenerService service;

    @GET
    @Path("/{key:[a-zA-Z0-9]{7}}")
    public Response redirect(@PathParam("key") String key) {
        return service.getOriginalUrl(key)
                .map(url -> Response.status(Response.Status.FOUND)
                        .location(URI.create(url))
                        .build())
                .orElseGet(() -> Response.status(Response.Status.NOT_FOUND).build());
    }
}