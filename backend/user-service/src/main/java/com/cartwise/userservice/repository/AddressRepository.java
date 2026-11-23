package com.cartwise.userservice.repository;

import com.cartwise.userservice.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AddressRepository extends JpaRepository<Address, UUID> {
    List<Address> findByUserId(String userId);

    Optional<Address> findByIdAndUserId(UUID id, String userId);
}