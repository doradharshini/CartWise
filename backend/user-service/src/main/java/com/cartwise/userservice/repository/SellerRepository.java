package com.cartwise.userservice.repository;

import com.cartwise.userservice.entity.SellerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SellerRepository extends JpaRepository<SellerProfile, UUID> {
    boolean existsByShopName(String shopName);
}
