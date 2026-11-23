package com.cartwise.userservice.repository;

import com.cartwise.userservice.entity.PasswordResetToken;
import com.cartwise.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {
    Optional<PasswordResetToken> findByToken(String token);

    void deleteByUser(User user);
}