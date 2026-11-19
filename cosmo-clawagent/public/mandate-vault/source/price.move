// Oracle access and price math for the COSMO vault.
// A price is "quote units per one whole base unit", scaled by 10^decimals.
module cosmo_vault::price {
    use supra_oracle::supra_oracle_storage;

    // Only constructible from test code; lets unit tests inject a price.
    struct TestPrice has key {
        price: u128,
        decimals: u16,
        ts_ms: u64,
    }

    // Returns (price, price_decimals, oracle_timestamp_ms).
    public fun read(pair: u32): (u128, u16, u64) acquires TestPrice {
        if (exists<TestPrice>(@cosmo_vault)) {
            let t = borrow_global<TestPrice>(@cosmo_vault);
            (t.price, t.decimals, t.ts_ms)
        } else {
            let (p, d, ts, _round) = supra_oracle_storage::get_price(pair);
            (p, d, ts)
        }
    }

    fun pow10(n: u64): u256 {
        let r: u256 = 1;
        let i = 0;
        while (i < n) {
            r = r * 10;
            i = i + 1;
        };
        r
    }

    // Value of base_amount (smallest base units) in smallest quote units, rounded down.
    public fun quote_for_base(
        base_amount: u64,
        price: u128,
        price_decimals: u16,
        base_decimals: u8,
        quote_decimals: u8,
    ): u64 {
        let num = (base_amount as u256) * (price as u256) * pow10((quote_decimals as u64));
        let den = pow10((base_decimals as u64)) * pow10((price_decimals as u64));
        ((num / den) as u64)
    }

    // Same value as quote_for_base, for amounts and results beyond u64.
    public fun value_of_base(
        base_amount: u128,
        price: u128,
        price_decimals: u16,
        base_decimals: u8,
        quote_decimals: u8,
    ): u128 {
        let num = (base_amount as u256) * (price as u256) * pow10((quote_decimals as u64));
        let den = pow10((base_decimals as u64)) * pow10((price_decimals as u64));
        ((num / den) as u128)
    }

    // Amount of base (smallest units) worth quote_amount (smallest units), rounded down.
    public fun base_for_quote(
        quote_amount: u64,
        price: u128,
        price_decimals: u16,
        base_decimals: u8,
        quote_decimals: u8,
    ): u64 {
        let num = (quote_amount as u256) * pow10((base_decimals as u64)) * pow10((price_decimals as u64));
        let den = (price as u256) * pow10((quote_decimals as u64));
        ((num / den) as u64)
    }

    #[test_only]
    public fun set_for_test(deployer: &signer, price: u128, decimals: u16, ts_ms: u64) acquires TestPrice {
        if (exists<TestPrice>(@cosmo_vault)) {
            let t = borrow_global_mut<TestPrice>(@cosmo_vault);
            t.price = price;
            t.decimals = decimals;
            t.ts_ms = ts_ms;
        } else {
            move_to(deployer, TestPrice { price, decimals, ts_ms });
        }
    }
}
