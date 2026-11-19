// Test counterparty: fills swaps from its own inventory at the oracle price minus a fee.
// It is deliberately a separate module: the vault does not trust it and checks
// every fill against its own mandate limits.
module cosmo_vault::oracle_venue {
    use std::signer;
    use supra_framework::event;
    use supra_framework::fungible_asset::{Self, FungibleAsset, Metadata};
    use supra_framework::object::{Self, ExtendRef, Object};
    use supra_framework::primary_fungible_store;
    use cosmo_vault::price;

    const E_NOT_ADMIN: u64 = 1;        // caller is not the package account
    const E_ALREADY_SETUP: u64 = 2;    // venue was already set up
    const E_WRONG_ASSET: u64 = 3;      // input asset is neither the base nor the quote asset
    const E_FEE_TOO_HIGH: u64 = 4;     // fee must be below 100 percent
    const E_MIN_OUT: u64 = 5;          // output is below the taker minimum

    const VENUE_SEED: vector<u8> = b"oracle_venue";

    struct Venue has key {
        extend_ref: ExtendRef,
        base: Object<Metadata>,
        quote: Object<Metadata>,
        pair: u32,
        fee_bps: u64,
    }

    #[event]
    struct VenueSwap has drop, store {
        sell_base: bool,
        amount_in: u64,
        amount_out: u64,
        price: u128,
        fee_bps: u64,
    }

    public entry fun setup(
        admin: &signer,
        base: Object<Metadata>,
        quote: Object<Metadata>,
        pair: u32,
        fee_bps: u64,
    ) {
        assert!(signer::address_of(admin) == @cosmo_vault, E_NOT_ADMIN);
        assert!(!exists<Venue>(@cosmo_vault), E_ALREADY_SETUP);
        assert!(fee_bps < 10000, E_FEE_TOO_HIGH);
        let ctor = object::create_named_object(admin, VENUE_SEED);
        let extend_ref = object::generate_extend_ref(&ctor);
        move_to(admin, Venue { extend_ref, base, quote, pair, fee_bps });
    }

    public entry fun set_fee_bps(admin: &signer, fee_bps: u64) acquires Venue {
        assert!(signer::address_of(admin) == @cosmo_vault, E_NOT_ADMIN);
        assert!(fee_bps < 10000, E_FEE_TOO_HIGH);
        borrow_global_mut<Venue>(@cosmo_vault).fee_bps = fee_bps;
    }

    #[view]
    public fun pool_address(): address {
        object::create_object_address(&@cosmo_vault, VENUE_SEED)
    }

    #[view]
    public fun fee_bps(): u64 acquires Venue {
        borrow_global<Venue>(@cosmo_vault).fee_bps
    }

    // Swap the whole input asset; returns the output asset. Open to any caller.
    public fun swap(fa_in: FungibleAsset): FungibleAsset acquires Venue {
        let v = borrow_global<Venue>(@cosmo_vault);
        let meta_in = fungible_asset::metadata_from_asset(&fa_in);
        let amount_in = fungible_asset::amount(&fa_in);
        let (p, pd, _ts) = price::read(v.pair);
        let bd = fungible_asset::decimals(v.base);
        let qd = fungible_asset::decimals(v.quote);
        let sell_base = meta_in == v.base;
        let fair = if (sell_base) {
            price::quote_for_base(amount_in, p, pd, bd, qd)
        } else {
            assert!(meta_in == v.quote, E_WRONG_ASSET);
            price::base_for_quote(amount_in, p, pd, bd, qd)
        };
        let amount_out = (((fair as u128) * ((10000 - v.fee_bps) as u128) / 10000) as u64);
        let pool = pool_address();
        primary_fungible_store::deposit(pool, fa_in);
        let pool_signer = object::generate_signer_for_extending(&v.extend_ref);
        let out_meta = if (sell_base) { v.quote } else { v.base };
        event::emit(VenueSwap { sell_base, amount_in, amount_out, price: p, fee_bps: v.fee_bps });
        primary_fungible_store::withdraw(&pool_signer, out_meta, amount_out)
    }

    public entry fun swap_entry(taker: &signer, sell_base: bool, amount_in: u64, min_out: u64) acquires Venue {
        let v = borrow_global<Venue>(@cosmo_vault);
        let meta_in = if (sell_base) { v.base } else { v.quote };
        let fa_in = primary_fungible_store::withdraw(taker, meta_in, amount_in);
        let fa_out = swap(fa_in);
        assert!(fungible_asset::amount(&fa_out) >= min_out, E_MIN_OUT);
        primary_fungible_store::deposit(signer::address_of(taker), fa_out);
    }
}
