// Three valueless test assets for the testnet demo: cvSUPRA (8 dec), cvUSD (6 dec) and
// cvCOSMO (6 dec), which stands in for wCOSMO as the bond asset. It is not wCOSMO.
// The package account can mint them. They have no value and exist only on testnet.
module cosmo_vault::test_assets {
    use std::option;
    use std::signer;
    use std::string;
    use supra_framework::fungible_asset::{Self, MintRef, Metadata};
    use supra_framework::object::{Self, Object};
    use supra_framework::primary_fungible_store;
    use supra_framework::timestamp;
    use aptos_std::smart_table::{Self, SmartTable};

    const E_NOT_ADMIN: u64 = 1;        // caller is not the package account
    const E_ALREADY_CREATED: u64 = 2;  // assets were already created
    const E_FAUCET_COOLDOWN: u64 = 3;  // this address used the faucet less than an hour ago

    const FAUCET_BASE: u64 = 20000000000000;  // 200,000 cvSUPRA
    const FAUCET_QUOTE: u64 = 25000000;       // 25 cvUSD
    const FAUCET_COOLDOWN_S: u64 = 3600;

    const BASE_SEED: vector<u8> = b"cvSUPRA";
    const QUOTE_SEED: vector<u8> = b"cvUSD";
    const BOND_SEED: vector<u8> = b"cvCOSMO";

    struct Refs has key {
        base_mint: MintRef,
        quote_mint: MintRef,
        bond_mint: MintRef,
        last_claim_s: SmartTable<address, u64>,
    }

    // One-shot: create the assets.
    public entry fun create(admin: &signer) {
        assert!(signer::address_of(admin) == @cosmo_vault, E_NOT_ADMIN);
        assert!(!exists<Refs>(@cosmo_vault), E_ALREADY_CREATED);
        let base_mint = create_one(admin, BASE_SEED, b"COSMO Vault Test SUPRA", 8);
        let quote_mint = create_one(admin, QUOTE_SEED, b"COSMO Vault Test USD", 6);
        let bond_mint = create_one(admin, BOND_SEED, b"COSMO Vault Test COSMO", 6);
        move_to(admin, Refs { base_mint, quote_mint, bond_mint, last_claim_s: smart_table::new() });
    }

    fun create_one(admin: &signer, seed: vector<u8>, name: vector<u8>, decimals: u8): MintRef {
        let ctor = object::create_named_object(admin, seed);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &ctor,
            option::none(),
            string::utf8(name),
            string::utf8(seed),
            decimals,
            string::utf8(b""),
            string::utf8(b""),
        );
        fungible_asset::generate_mint_ref(&ctor)
    }

    public entry fun mint(admin: &signer, is_base: bool, to: address, amount: u64) acquires Refs {
        assert!(signer::address_of(admin) == @cosmo_vault, E_NOT_ADMIN);
        let refs = borrow_global<Refs>(@cosmo_vault);
        let fa = if (is_base) {
            fungible_asset::mint(&refs.base_mint, amount)
        } else {
            fungible_asset::mint(&refs.quote_mint, amount)
        };
        primary_fungible_store::deposit(to, fa);
    }

    public entry fun mint_bond_asset(admin: &signer, to: address, amount: u64) acquires Refs {
        assert!(signer::address_of(admin) == @cosmo_vault, E_NOT_ADMIN);
        let refs = borrow_global<Refs>(@cosmo_vault);
        primary_fungible_store::deposit(to, fungible_asset::mint(&refs.bond_mint, amount));
    }

    // Test tokens for anyone who wants to trade against the vault: a fixed
    // amount of both assets, once per hour per address. Testnet only, no value.
    public entry fun faucet(user: &signer) acquires Refs {
        let refs = borrow_global_mut<Refs>(@cosmo_vault);
        let addr = signer::address_of(user);
        let now = timestamp::now_seconds();
        if (smart_table::contains(&refs.last_claim_s, addr)) {
            let last = smart_table::borrow_mut(&mut refs.last_claim_s, addr);
            assert!(now >= *last + FAUCET_COOLDOWN_S, E_FAUCET_COOLDOWN);
            *last = now;
        } else {
            smart_table::add(&mut refs.last_claim_s, addr, now);
        };
        primary_fungible_store::deposit(addr, fungible_asset::mint(&refs.base_mint, FAUCET_BASE));
        primary_fungible_store::deposit(addr, fungible_asset::mint(&refs.quote_mint, FAUCET_QUOTE));
    }

    #[view]
    public fun base_metadata(): Object<Metadata> {
        object::address_to_object<Metadata>(object::create_object_address(&@cosmo_vault, BASE_SEED))
    }

    #[view]
    public fun quote_metadata(): Object<Metadata> {
        object::address_to_object<Metadata>(object::create_object_address(&@cosmo_vault, QUOTE_SEED))
    }

    #[view]
    public fun bond_metadata(): Object<Metadata> {
        object::address_to_object<Metadata>(object::create_object_address(&@cosmo_vault, BOND_SEED))
    }
}
