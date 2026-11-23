package com.cartwise.cartservice.repository;

import com.cartwise.cartservice.entity.Cart;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartRepository extends CrudRepository<Cart, String> {
}