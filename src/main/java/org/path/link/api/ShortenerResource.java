package org.path.link.api;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.hibernate.validator.constraints.URL;
import org.path.link.model.ShortLink;
import org.path.link.service.ShortenerService;

@Path("/api/v1")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ShortenerResource {

    @Inject
    ShortenerService service;

    public record ShortenRequest(
            @NotBlank(message = "URL cannot be blank")
            @URL(message = "Invalid URL format")
            String url
    ) {}

    public record ShortenResponse(String key, String shortUrl) {}

    @POST
    @Path("/shorten")
    public Response shorten(@Valid ShortenRequest request) {
        ShortLink link = service.createShortLink(request.url());
        ShortenResponse responseBody = new ShortenResponse(link.getShortCode(), "/" + link.getShortCode());
        return Response.status(Response.Status.CREATED)
                .entity(responseBody)
                .build();
    }
}