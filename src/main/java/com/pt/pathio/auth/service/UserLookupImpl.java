package com.pt.pathio.auth.service;

import com.pt.pathio.auth.api.UserLookup;
import com.pt.pathio.auth.api.UserView;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Auth-owned implementation of the published {@link UserLookup} contract. Bridges the JPA
 * persistence layer ({@code UserRepository}/{@code User}) to the immutable {@link UserView} values
 * consumed by other modules. Internal to the auth module: consumers must only ever see the
 * {@code auth.api} interface.
 */
@Service
@RequiredArgsConstructor
public class UserLookupImpl implements UserLookup {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<UserView> findUser(UUID id) {
        return userRepository.findById(id).map(this::toView);
    }

    private UserView toView(User user) {
        return new UserView(user.getId());
    }
}