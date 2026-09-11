package org.path;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.hibernate.validator.constraints.URL;

import java.net.URI;

@Path("/")
public class ShortenerResource {

    @Inject
    ShortenerService service;

    // DTO for clean JSON payload handling
    public record ShortenRequest(
            @NotBlank(message = "URL cannot be blank")
            @URL(message = "Invalid URL format")
            String url
    ) {}

    public record ShortenResponse(String key, String shortUrl) {}

    @POST
    @Path("/api/v1/shorten")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response shorten(@Valid ShortenRequest request) {
        ShortLink link = service.createShortLink(request.url());

        // 201 Created status with location header pointing to the new resource
        ShortenResponse responseBody = new ShortenResponse(link.key, "/" + link.key);
        return Response.status(Response.Status.CREATED)
                .entity(responseBody)
                .build();
    }

    @GET
    @Path("/{key}")
    public Response redirect(@PathParam("key") String key) {
        return service.getOriginalUrl(key)
                .map(url -> Response.status(Response.Status.MOVED_PERMANENTLY) // 301 for SEO/Caching or 302 (FOUND)
                        .location(URI.create(url))
                        .build())
                .orElseGet(() -> Response.status(Response.Status.NOT_FOUND).build());
    }
}