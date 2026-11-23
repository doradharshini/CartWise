package com.cartwise.inventoryservice.dto.response;

public record InventoryResponse(
        String skuCode,
        Integer availableQuantity,
        Integer reservedQuantity,
        boolean inStock
) {
}