// COSMO mandate vault.
// The owner deposits capital and sets a mandate. The agent key can only swap
// between the two vault assets through the venue, and only inside the mandate
// limits, which are checked here on-chain. The agent can never withdraw and
// can never name a recipient. Every action emits an event that carries the
// mandate hash, the oracle price used, and balances before and after.
//
// v0.2: the vault also provides liquidity. The agent posts a quote (an edge per
// side, a size per side, a lifetime). Posting moves no capital. Anyone can then
// trade against the vault with take(); the price is the oracle price of that
// transaction, moved by the quoted edge in favour of the vault, and every fill
// passes the same mandate limits. The mandate fixes a minimum edge, so no quote
// of the agent can make the vault trade below the oracle price.
//
// v0.3: someone stands behind the agent. The mandate names a bond, how deep
// a loss that bond covers, and a share of the gain. A backer posts the bond
// and thereby accepts exactly this mandate; without a posted bond the agent
// cannot act. Each mandate is settled once, when it has run out or the owner
// has revoked it: the vault value is compared with "deposits left untouched"
// at the oracle price of the settlement. A gain pays the fee share from the
// vault to the backer, a loss pays the matching part of the bond to the owner.
module cosmo_vault::mandate_vault {
    use std::option::{Self, Option};
    use std::signer;
    use supra_framework::event;
    use supra_framework::fungible_asset::{Self, Metadata};
    use supra_framework::object::{Self, ExtendRef, Object};
    use supra_framework::primary_fungible_store;
    use supra_framework::timestamp;
    use cosmo_vault::oracle_venue;
    use cosmo_vault::price;

    const E_NOT_OWNER: u64 = 1;          // caller is not the vault owner
    const E_NOT_AGENT: u64 = 2;          // caller is not the agent named in the active mandate
    const E_NO_MANDATE: u64 = 3;         // vault has no active mandate
    const E_NOT_YET_VALID: u64 = 4;      // mandate validity window has not started
    const E_EXPIRED: u64 = 5;            // mandate validity window has ended
    const E_PAUSED: u64 = 6;             // owner paused the vault
    const E_HALTED: u64 = 7;             // vault halted itself after the NAV floor was breached
    const E_ORACLE_STALE: u64 = 8;       // oracle price is older than the mandate allows
    const E_NOTIONAL_CAP: u64 = 9;       // action is larger than the per-action notional cap
    const E_DAILY_CAP: u64 = 10;         // action would exceed the rolling 24h turnover cap
    const E_PRICE_BOUND: u64 = 11;       // fill is worse than the allowed deviation from the oracle price
    const E_MIN_OUT: u64 = 12;           // fill is below the minimum the agent itself asked for
    const E_WEIGHT_BAND: u64 = 13;       // action would leave the allowed base-weight band or move away from it
    const E_NAV_FLOOR: u64 = 14;         // vault value is below the mandate floor; agent is frozen
    const E_COOLDOWN: u64 = 15;          // minimum time between agent actions has not passed
    const E_BAD_MANDATE: u64 = 16;       // mandate parameters are inconsistent
    const E_ZERO_AMOUNT: u64 = 17;       // amount must be greater than zero
    const E_FLOOR_NOT_BREACHED: u64 = 18; // halt can only be tripped while value is below the floor
    const E_SAME_ASSET: u64 = 19;        // base and quote asset must differ
    const E_EDGE_TOO_LOW: u64 = 20;      // quoted edge is below the mandate minimum or not below 100 percent
    const E_QUOTE_TTL: u64 = 21;         // quote lifetime is zero or longer than the mandate allows
    const E_NO_QUOTE: u64 = 22;          // vault has no live quote (none posted, expired, or from an older mandate)
    const E_QUOTE_SIZE: u64 = 23;        // fill is larger than what is left on that side of the quote
    const E_HOOKED_ASSET: u64 = 24;      // asset carries transfer hooks; the vault only holds plain assets
    const E_WRONG_ASSET_OUT: u64 = 25;   // venue returned an asset that is not the other vault asset
    const E_NO_BOND: u64 = 26;           // no bond is posted for the mandate
    const E_BOND_EXISTS: u64 = 27;       // a bond is already posted for this mandate
    const E_MANDATE_MISMATCH: u64 = 28;  // backer named another epoch or mandate hash than the one on-chain
    const E_UNSETTLED: u64 = 29;         // the previous mandate still has a bond; settle it first
    const E_NOT_ENDED: u64 = 30;         // mandate has neither run out nor been revoked
    const E_FEE_RESERVE: u64 = 31;       // withdrawal would leave less in the vault than the fee accrued so far

    const DAY_SECS: u64 = 86400;
    const BPS: u64 = 10000;

    struct Mandate has copy, drop, store {
        epoch: u64,
        mandate_hash: vector<u8>,
        agent: address,
        valid_from_s: u64,
        valid_until_s: u64,
        max_notional_per_action: u64,
        max_daily_turnover: u64,
        max_slippage_bps: u64,
        max_oracle_age_s: u64,
        min_base_weight_bps: u64,
        max_base_weight_bps: u64,
        nav_floor: u64,
        min_action_interval_s: u64,
        min_edge_bps: u64,
        max_quote_ttl_s: u64,
        bond_required: u64,         // bond the backer must post, in units of the bond asset
        cover_bps: u64,             // loss depth the bond covers, in bps of the reference value
        fee_share_bps: u64,         // share of a gain that goes to the backer
    }

    // Bond behind the agent. The reference amounts are the vault balances when
    // the bond was posted plus every later deposit, and every later withdrawal.
    struct Bond has copy, drop, store {
        backer: address,
        amount: u64,
        epoch: u64,
        ref_base_in: u64,
        ref_quote_in: u64,
        ref_base_out: u64,
        ref_quote_out: u64,
        posted_s: u64,
    }

    // Standing offer of the vault. An edge is the share of the oracle-fair
    // output that the taker does not receive; it stays in the vault.
    struct Quote has copy, drop, store {
        quote_seq: u64,
        epoch: u64,
        decision_hash: vector<u8>,
        bid_edge_bps: u64,          // taker sells base to the vault
        ask_edge_bps: u64,          // taker buys base from the vault
        bid_left_quote: u64,        // quote units the vault will still pay out
        ask_left_base: u64,         // base units the vault will still pay out
        posted_s: u64,
        expires_s: u64,
    }

    struct Vault has key {
        owner: address,
        extend_ref: ExtendRef,
        base: Object<Metadata>,
        quote: Object<Metadata>,
        pair: u32,
        bond_asset: Object<Metadata>,
        mandate: Option<Mandate>,
        pending: Option<Mandate>,   // revoked mandate that still waits for its settlement
        bond: Option<Bond>,
        quote_live: Option<Quote>,
        quote_seq: u64,
        epoch: u64,
        paused: bool,
        halted: bool,
        action_seq: u64,
        attest_seq: u64,
        window_start_s: u64,
        window_turnover: u64,
        total_turnover: u64,
        last_action_s: u64,
    }

    struct VaultState has copy, drop {
        owner: address,
        base_balance: u64,
        quote_balance: u64,
        paused: bool,
        halted: bool,
        epoch: u64,
        action_seq: u64,
        attest_seq: u64,
        window_start_s: u64,
        window_turnover: u64,
        total_turnover: u64,
        last_action_s: u64,
        has_mandate: bool,
        quote_seq: u64,
        has_quote: bool,
        bond_asset: address,
        has_bond: bool,
        pending_settlement: bool,
    }

    #[event]
    struct VaultCreated has drop, store {
        vault: address,
        owner: address,
        base: address,
        quote: address,
        pair: u32,
        bond_asset: address,
    }

    #[event]
    struct Deposited has drop, store {
        vault: address,
        is_base: bool,
        amount: u64,
        base_after: u64,
        quote_after: u64,
    }

    #[event]
    struct Withdrawn has drop, store {
        vault: address,
        is_base: bool,
        amount: u64,
        base_after: u64,
        quote_after: u64,
    }

    #[event]
    struct MandateSet has drop, store {
        vault: address,
        mandate: Mandate,
    }

    #[event]
    struct MandateRevoked has drop, store {
        vault: address,
        epoch: u64,
        pending_settlement: bool,
        time_s: u64,
    }

    #[event]
    struct BondPosted has drop, store {
        vault: address,
        mandate_hash: vector<u8>,
        bond: Bond,
    }

    // The one settlement of a mandate. All amounts that went into the result are
    // in the event, so the result can be recomputed from it.
    #[event]
    struct Settled has drop, store {
        vault: address,
        epoch: u64,
        mandate_hash: vector<u8>,
        revoked: bool,
        owner: address,
        backer: address,
        oracle_price: u128,
        oracle_decimals: u16,
        oracle_ts_ms: u64,
        base_balance: u64,
        quote_balance: u64,
        ref_base_in: u64,
        ref_quote_in: u64,
        ref_base_out: u64,
        ref_quote_out: u64,
        value_now: u128,
        value_ref: u128,
        cover_bps: u64,
        fee_share_bps: u64,
        fee_quote: u64,
        fee_base: u64,
        bond_amount: u64,
        bond_to_owner: u64,
        bond_to_backer: u64,
        time_s: u64,
    }

    #[event]
    struct PausedSet has drop, store {
        vault: address,
        paused: bool,
    }

    #[event]
    struct HaltSet has drop, store {
        vault: address,
        halted: bool,
        nav: u64,
        nav_floor: u64,
        oracle_price: u128,
    }

    #[event]
    struct ActionExecuted has drop, store {
        vault: address,
        epoch: u64,
        mandate_hash: vector<u8>,
        action_seq: u64,
        decision_hash: vector<u8>,
        sell_base: bool,
        amount_in: u64,
        amount_out: u64,
        fair_out: u64,
        notional: u64,
        oracle_price: u128,
        oracle_decimals: u16,
        oracle_ts_ms: u64,
        base_before: u64,
        quote_before: u64,
        base_after: u64,
        quote_after: u64,
        nav_before: u64,
        nav_after: u64,
        weight_before_bps: u64,
        weight_after_bps: u64,
        window_turnover: u64,
        time_s: u64,
    }

    #[event]
    struct QuotePosted has drop, store {
        vault: address,
        mandate_hash: vector<u8>,
        quote: Quote,
    }

    #[event]
    struct QuoteCancelled has drop, store {
        vault: address,
        epoch: u64,
        quote_seq: u64,
        decision_hash: vector<u8>,
        time_s: u64,
    }

    // One fill of the standing quote. amount_in and amount_out are from the
    // point of view of the vault: what it received and what it paid.
    #[event]
    struct FillExecuted has drop, store {
        vault: address,
        epoch: u64,
        mandate_hash: vector<u8>,
        action_seq: u64,
        quote_seq: u64,
        decision_hash: vector<u8>,
        taker: address,
        vault_buys_base: bool,
        amount_in: u64,
        amount_out: u64,
        fair_out: u64,
        edge_bps: u64,
        notional: u64,
        oracle_price: u128,
        oracle_decimals: u16,
        oracle_ts_ms: u64,
        base_before: u64,
        quote_before: u64,
        base_after: u64,
        quote_after: u64,
        nav_before: u64,
        nav_after: u64,
        weight_before_bps: u64,
        weight_after_bps: u64,
        window_turnover: u64,
        bid_left_quote: u64,
        ask_left_base: u64,
        time_s: u64,
    }

    #[event]
    struct DecisionAttested has drop, store {
        vault: address,
        epoch: u64,
        mandate_hash: vector<u8>,
        attest_seq: u64,
        kind: u8,
        decision_hash: vector<u8>,
        time_s: u64,
    }

    // ---------------------------------------------------------------- owner

    public entry fun create_vault(
        owner: &signer,
        seed: vector<u8>,
        base: Object<Metadata>,
        quote: Object<Metadata>,
        pair: u32,
        bond_asset: Object<Metadata>,
    ) {
        assert!(object::object_address(&base) != object::object_address(&quote), E_SAME_ASSET);
        assert!(object::object_address(&bond_asset) != object::object_address(&base), E_SAME_ASSET);
        assert!(object::object_address(&bond_asset) != object::object_address(&quote), E_SAME_ASSET);
        let ctor = object::create_named_object(owner, seed);
        let extend_ref = object::generate_extend_ref(&ctor);
        let vault_signer = object::generate_signer(&ctor);
        let vault = signer::address_of(&vault_signer);
        // Same rule as rfq_engine: an asset with transfer hooks could abort inside
        // the hook and strand capital, so the vault refuses it at creation.
        let base_store = primary_fungible_store::ensure_primary_store_exists(vault, base);
        let quote_store = primary_fungible_store::ensure_primary_store_exists(vault, quote);
        assert!(!fungible_asset::is_store_dispatchable(base_store), E_HOOKED_ASSET);
        assert!(!fungible_asset::is_store_dispatchable(quote_store), E_HOOKED_ASSET);
        let bond_store = primary_fungible_store::ensure_primary_store_exists(vault, bond_asset);
        assert!(!fungible_asset::is_store_dispatchable(bond_store), E_HOOKED_ASSET);
        let owner_addr = signer::address_of(owner);
        move_to(&vault_signer, Vault {
            owner: owner_addr,
            extend_ref,
            base,
            quote,
            pair,
            bond_asset,
            mandate: option::none(),
            pending: option::none(),
            bond: option::none(),
            quote_live: option::none(),
            quote_seq: 0,
            epoch: 0,
            paused: false,
            halted: false,
            action_seq: 0,
            attest_seq: 0,
            window_start_s: 0,
            window_turnover: 0,
            total_turnover: 0,
            last_action_s: 0,
        });
        event::emit(VaultCreated {
            vault,
            owner: owner_addr,
            base: object::object_address(&base),
            quote: object::object_address(&quote),
            pair,
            bond_asset: object::object_address(&bond_asset),
        });
    }

    public entry fun deposit(owner: &signer, vault: address, is_base: bool, amount: u64) acquires Vault {
        assert!(amount > 0, E_ZERO_AMOUNT);
        let v = borrow_global_mut<Vault>(vault);
        assert!(signer::address_of(owner) == v.owner, E_NOT_OWNER);
        let meta = if (is_base) { v.base } else { v.quote };
        let fa = primary_fungible_store::withdraw(owner, meta, amount);
        primary_fungible_store::deposit(vault, fa);
        if (option::is_some(&v.bond)) {
            let b = option::borrow_mut(&mut v.bond);
            if (is_base) { b.ref_base_in = b.ref_base_in + amount } else { b.ref_quote_in = b.ref_quote_in + amount };
        };
        event::emit(Deposited {
            vault,
            is_base,
            amount,
            base_after: primary_fungible_store::balance(vault, v.base),
            quote_after: primary_fungible_store::balance(vault, v.quote),
        });
    }

    // Only the owner can withdraw, and only to the owner address. While a bond
    // stands, the vault must keep at least the fee accrued so far; the check
    // uses the last oracle price whatever its age, so a silent oracle never
    // locks the owner in.
    public entry fun withdraw(owner: &signer, vault: address, is_base: bool, amount: u64) acquires Vault {
        assert!(amount > 0, E_ZERO_AMOUNT);
        let v = borrow_global_mut<Vault>(vault);
        assert!(signer::address_of(owner) == v.owner, E_NOT_OWNER);
        let meta = if (is_base) { v.base } else { v.quote };
        let vault_signer = object::generate_signer_for_extending(&v.extend_ref);
        let fa = primary_fungible_store::withdraw(&vault_signer, meta, amount);
        primary_fungible_store::deposit(v.owner, fa);
        if (option::is_some(&v.bond)) {
            let b = option::borrow_mut(&mut v.bond);
            if (is_base) { b.ref_base_out = b.ref_base_out + amount } else { b.ref_quote_out = b.ref_quote_out + amount };
            let bond = *b;
            let m = if (option::is_some(&v.pending)) { *option::borrow(&v.pending) } else { *option::borrow(&v.mandate) };
            let (p, pd, _ts) = price::read(v.pair);
            let bd = fungible_asset::decimals(v.base);
            let qd = fungible_asset::decimals(v.quote);
            let base_bal = primary_fungible_store::balance(vault, v.base);
            let quote_bal = primary_fungible_store::balance(vault, v.quote);
            let (value_now, value_ref) = result_values(&bond, base_bal, quote_bal, p, pd, bd, qd);
            let fee = fee_of(value_now, value_ref, m.fee_share_bps);
            let left = price::value_of_base((base_bal as u128), p, pd, bd, qd) + (quote_bal as u128);
            assert!(left >= fee, E_FEE_RESERVE);
        };
        event::emit(Withdrawn {
            vault,
            is_base,
            amount,
            base_after: primary_fungible_store::balance(vault, v.base),
            quote_after: primary_fungible_store::balance(vault, v.quote),
        });
    }

    public entry fun set_mandate(
        owner: &signer,
        vault: address,
        mandate_hash: vector<u8>,
        agent: address,
        valid_from_s: u64,
        valid_until_s: u64,
        max_notional_per_action: u64,
        max_daily_turnover: u64,
        max_slippage_bps: u64,
        max_oracle_age_s: u64,
        min_base_weight_bps: u64,
        max_base_weight_bps: u64,
        nav_floor: u64,
        min_action_interval_s: u64,
        min_edge_bps: u64,
        max_quote_ttl_s: u64,
        bond_required: u64,
        cover_bps: u64,
        fee_share_bps: u64,
    ) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        assert!(signer::address_of(owner) == v.owner, E_NOT_OWNER);
        assert!(valid_from_s < valid_until_s, E_BAD_MANDATE);
        assert!(max_slippage_bps < BPS, E_BAD_MANDATE);
        assert!(min_base_weight_bps <= max_base_weight_bps && max_base_weight_bps <= BPS, E_BAD_MANDATE);
        assert!(max_notional_per_action > 0 && max_notional_per_action <= max_daily_turnover, E_BAD_MANDATE);
        assert!(max_oracle_age_s > 0, E_BAD_MANDATE);
        assert!(min_edge_bps < BPS, E_BAD_MANDATE);
        assert!(bond_required > 0, E_BAD_MANDATE);
        assert!(cover_bps > 0 && cover_bps <= BPS, E_BAD_MANDATE);
        assert!(fee_share_bps < BPS, E_BAD_MANDATE);
        // A posted bond belongs to the mandate its backer accepted. That mandate
        // must be settled before the owner can set another one.
        assert!(option::is_none(&v.bond), E_UNSETTLED);
        v.epoch = v.epoch + 1;
        let m = Mandate {
            epoch: v.epoch,
            mandate_hash,
            agent,
            valid_from_s,
            valid_until_s,
            max_notional_per_action,
            max_daily_turnover,
            max_slippage_bps,
            max_oracle_age_s,
            min_base_weight_bps,
            max_base_weight_bps,
            nav_floor,
            min_action_interval_s,
            min_edge_bps,
            max_quote_ttl_s,
            bond_required,
            cover_bps,
            fee_share_bps,
        };
        v.mandate = option::some(m);
        v.quote_live = option::none();
        v.window_start_s = 0;
        v.window_turnover = 0;
        v.last_action_s = 0;
        event::emit(MandateSet { vault, mandate: m });
    }

    public entry fun revoke_mandate(owner: &signer, vault: address) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        assert!(signer::address_of(owner) == v.owner, E_NOT_OWNER);
        // The agent stops at once. If a bond stands, the mandate waits for its
        // settlement, which anyone can trigger from now on.
        let pending_settlement = option::is_some(&v.mandate) && option::is_some(&v.bond);
        if (pending_settlement) {
            v.pending = v.mandate;
        };
        v.mandate = option::none();
        v.quote_live = option::none();
        event::emit(MandateRevoked { vault, epoch: v.epoch, pending_settlement, time_s: timestamp::now_seconds() });
    }

    public entry fun set_paused(owner: &signer, vault: address, paused: bool) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        assert!(signer::address_of(owner) == v.owner, E_NOT_OWNER);
        v.paused = paused;
        event::emit(PausedSet { vault, paused });
    }

    public entry fun clear_halt(owner: &signer, vault: address) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        assert!(signer::address_of(owner) == v.owner, E_NOT_OWNER);
        v.halted = false;
        event::emit(HaltSet { vault, halted: false, nav: 0, nav_floor: 0, oracle_price: 0 });
    }

    // ---------------------------------------------------------------- anyone

    // Anyone may freeze the agent once the vault value is below the mandate floor.
    public entry fun trip_halt(vault: address) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        assert!(option::is_some(&v.mandate), E_NO_MANDATE);
        let m = *option::borrow(&v.mandate);
        let (p, pd, ts_ms) = price::read(v.pair);
        assert_fresh(ts_ms, m.max_oracle_age_s);
        let bd = fungible_asset::decimals(v.base);
        let qd = fungible_asset::decimals(v.quote);
        let base_bal = primary_fungible_store::balance(vault, v.base);
        let quote_bal = primary_fungible_store::balance(vault, v.quote);
        let nav = quote_bal + price::quote_for_base(base_bal, p, pd, bd, qd);
        assert!(nav < m.nav_floor, E_FLOOR_NOT_BREACHED);
        v.halted = true;
        event::emit(HaltSet { vault, halted: true, nav, nav_floor: m.nav_floor, oracle_price: p });
    }

    // ---------------------------------------------------------------- backer

    // Post the bond for the mandate that is on-chain right now. Naming epoch and
    // hash is the backer's acceptance: if the owner has changed the mandate in
    // the meantime, this aborts and no bond moves.
    public entry fun post_bond(
        backer: &signer,
        vault: address,
        epoch: u64,
        mandate_hash: vector<u8>,
    ) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        assert!(option::is_some(&v.mandate), E_NO_MANDATE);
        let m = *option::borrow(&v.mandate);
        assert!(epoch == m.epoch && mandate_hash == m.mandate_hash, E_MANDATE_MISMATCH);
        assert!(option::is_none(&v.bond), E_BOND_EXISTS);
        let now = timestamp::now_seconds();
        assert!(now < m.valid_until_s, E_EXPIRED);
        let fa = primary_fungible_store::withdraw(backer, v.bond_asset, m.bond_required);
        primary_fungible_store::deposit(vault, fa);
        let bond = Bond {
            backer: signer::address_of(backer),
            amount: m.bond_required,
            epoch: m.epoch,
            ref_base_in: primary_fungible_store::balance(vault, v.base),
            ref_quote_in: primary_fungible_store::balance(vault, v.quote),
            ref_base_out: 0,
            ref_quote_out: 0,
            posted_s: now,
        };
        v.bond = option::some(bond);
        event::emit(BondPosted { vault, mandate_hash: m.mandate_hash, bond });
    }

    // ---------------------------------------------------------------- anyone: settlement

    // Settle the mandate once it has run out or has been revoked. Anyone may call
    // this; every payment has a fixed recipient (backer or owner).
    public entry fun settle(vault: address) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        let now = timestamp::now_seconds();
        let revoked = option::is_some(&v.pending);
        let m = if (revoked) {
            option::extract(&mut v.pending)
        } else {
            assert!(option::is_some(&v.mandate), E_NO_MANDATE);
            let cur = option::extract(&mut v.mandate);
            assert!(now >= cur.valid_until_s, E_NOT_ENDED);
            v.quote_live = option::none();
            cur
        };
        assert!(option::is_some(&v.bond), E_NO_BOND);
        let bond = option::extract(&mut v.bond);

        let (p, pd, ts_ms) = price::read(v.pair);
        assert_fresh(ts_ms, m.max_oracle_age_s);
        let bd = fungible_asset::decimals(v.base);
        let qd = fungible_asset::decimals(v.quote);
        let base_balance = primary_fungible_store::balance(vault, v.base);
        let quote_balance = primary_fungible_store::balance(vault, v.quote);
        let (value_now, value_ref) = result_values(&bond, base_balance, quote_balance, p, pd, bd, qd);
        let vault_signer = object::generate_signer_for_extending(&v.extend_ref);

        // gain: the fee share leaves the vault, in quote first, the rest in base
        let fee = fee_of(value_now, value_ref, m.fee_share_bps);
        let fee_quote = if (fee > (quote_balance as u128)) { quote_balance } else { (fee as u64) };
        let fee_rest = ((fee - (fee_quote as u128)) as u64);
        let fee_base_fair = price::base_for_quote(fee_rest, p, pd, bd, qd);
        let fee_base = if (fee_base_fair > base_balance) { base_balance } else { fee_base_fair };
        if (fee_quote > 0) {
            primary_fungible_store::deposit(bond.backer, primary_fungible_store::withdraw(&vault_signer, v.quote, fee_quote));
        };
        if (fee_base > 0) {
            primary_fungible_store::deposit(bond.backer, primary_fungible_store::withdraw(&vault_signer, v.base, fee_base));
        };

        // loss: the bond pays the owner in proportion to the covered depth
        let bond_to_owner = slash_of(value_now, value_ref, m.cover_bps, bond.amount);
        let bond_to_backer = bond.amount - bond_to_owner;
        if (bond_to_owner > 0) {
            primary_fungible_store::deposit(v.owner, primary_fungible_store::withdraw(&vault_signer, v.bond_asset, bond_to_owner));
        };
        if (bond_to_backer > 0) {
            primary_fungible_store::deposit(bond.backer, primary_fungible_store::withdraw(&vault_signer, v.bond_asset, bond_to_backer));
        };

        event::emit(Settled {
            vault,
            epoch: m.epoch,
            mandate_hash: m.mandate_hash,
            revoked,
            owner: v.owner,
            backer: bond.backer,
            oracle_price: p,
            oracle_decimals: pd,
            oracle_ts_ms: ts_ms,
            base_balance,
            quote_balance,
            ref_base_in: bond.ref_base_in,
            ref_quote_in: bond.ref_quote_in,
            ref_base_out: bond.ref_base_out,
            ref_quote_out: bond.ref_quote_out,
            value_now,
            value_ref,
            cover_bps: m.cover_bps,
            fee_share_bps: m.fee_share_bps,
            fee_quote,
            fee_base,
            bond_amount: bond.amount,
            bond_to_owner,
            bond_to_backer,
            time_s: now,
        });
    }

    // ---------------------------------------------------------------- agent

    // The only way the agent can move capital: swap one vault asset for the
    // other through the venue. Output always returns to the vault.
    public entry fun agent_swap(
        agent: &signer,
        vault: address,
        sell_base: bool,
        amount_in: u64,
        min_out: u64,
        decision_hash: vector<u8>,
    ) acquires Vault {
        assert!(amount_in > 0, E_ZERO_AMOUNT);
        let v = borrow_global_mut<Vault>(vault);
        let m = active_mandate(v, signer::address_of(agent));
        let now = timestamp::now_seconds();

        assert!(v.last_action_s == 0 || now >= v.last_action_s + m.min_action_interval_s, E_COOLDOWN);

        let (p, pd, ts_ms) = price::read(v.pair);
        assert_fresh(ts_ms, m.max_oracle_age_s);

        let bd = fungible_asset::decimals(v.base);
        let qd = fungible_asset::decimals(v.quote);
        let base_before = primary_fungible_store::balance(vault, v.base);
        let quote_before = primary_fungible_store::balance(vault, v.quote);
        let nav_before = quote_before + price::quote_for_base(base_before, p, pd, bd, qd);
        assert!(nav_before >= m.nav_floor, E_NAV_FLOOR);
        let weight_before = weight_bps(base_before, quote_before, p, pd, bd, qd);

        let (notional, fair_out) = if (sell_base) {
            let q = price::quote_for_base(amount_in, p, pd, bd, qd);
            (q, q)
        } else {
            (amount_in, price::base_for_quote(amount_in, p, pd, bd, qd))
        };
        assert!(notional <= m.max_notional_per_action, E_NOTIONAL_CAP);

        if (now >= v.window_start_s + DAY_SECS) {
            v.window_start_s = now;
            v.window_turnover = 0;
        };
        assert!(v.window_turnover + notional <= m.max_daily_turnover, E_DAILY_CAP);

        let vault_signer = object::generate_signer_for_extending(&v.extend_ref);
        let (meta_in, meta_out) = if (sell_base) { (v.base, v.quote) } else { (v.quote, v.base) };
        let fa_in = primary_fungible_store::withdraw(&vault_signer, meta_in, amount_in);
        let fa_out = oracle_venue::swap(fa_in);
        assert!(fungible_asset::metadata_from_asset(&fa_out) == meta_out, E_WRONG_ASSET_OUT);
        let amount_out = fungible_asset::amount(&fa_out);
        let floor = (((fair_out as u128) * ((BPS - m.max_slippage_bps) as u128) / (BPS as u128)) as u64);
        assert!(amount_out >= floor, E_PRICE_BOUND);
        assert!(amount_out >= min_out, E_MIN_OUT);
        primary_fungible_store::deposit(vault, fa_out);

        let base_after = primary_fungible_store::balance(vault, v.base);
        let quote_after = primary_fungible_store::balance(vault, v.quote);
        let nav_after = quote_after + price::quote_for_base(base_after, p, pd, bd, qd);
        let weight_after = weight_bps(base_after, quote_after, p, pd, bd, qd);
        let dist_before = band_distance(weight_before, m.min_base_weight_bps, m.max_base_weight_bps);
        let dist_after = band_distance(weight_after, m.min_base_weight_bps, m.max_base_weight_bps);
        assert!(dist_after == 0 || dist_after < dist_before, E_WEIGHT_BAND);

        v.window_turnover = v.window_turnover + notional;
        v.total_turnover = v.total_turnover + notional;
        v.last_action_s = now;
        v.action_seq = v.action_seq + 1;

        event::emit(ActionExecuted {
            vault,
            epoch: m.epoch,
            mandate_hash: m.mandate_hash,
            action_seq: v.action_seq,
            decision_hash,
            sell_base,
            amount_in,
            amount_out,
            fair_out,
            notional,
            oracle_price: p,
            oracle_decimals: pd,
            oracle_ts_ms: ts_ms,
            base_before,
            quote_before,
            base_after,
            quote_after,
            nav_before,
            nav_after,
            weight_before_bps: weight_before,
            weight_after_bps: weight_after,
            window_turnover: v.window_turnover,
            time_s: now,
        });
    }

    // Anchor a decision that moved no capital (hold, stop) on-chain.
    public entry fun agent_attest(
        agent: &signer,
        vault: address,
        kind: u8,
        decision_hash: vector<u8>,
    ) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        let m = active_mandate(v, signer::address_of(agent));
        v.attest_seq = v.attest_seq + 1;
        event::emit(DecisionAttested {
            vault,
            epoch: m.epoch,
            mandate_hash: m.mandate_hash,
            attest_seq: v.attest_seq,
            kind,
            decision_hash,
            time_s: timestamp::now_seconds(),
        });
    }

    // Post or replace the standing quote. Moves no capital.
    public entry fun agent_post_quote(
        agent: &signer,
        vault: address,
        bid_edge_bps: u64,
        ask_edge_bps: u64,
        bid_size_quote: u64,
        ask_size_base: u64,
        ttl_s: u64,
        decision_hash: vector<u8>,
    ) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        let m = active_mandate(v, signer::address_of(agent));
        assert!(bid_edge_bps >= m.min_edge_bps && bid_edge_bps < BPS, E_EDGE_TOO_LOW);
        assert!(ask_edge_bps >= m.min_edge_bps && ask_edge_bps < BPS, E_EDGE_TOO_LOW);
        assert!(ttl_s > 0 && ttl_s <= m.max_quote_ttl_s, E_QUOTE_TTL);
        let now = timestamp::now_seconds();
        v.quote_seq = v.quote_seq + 1;
        let q = Quote {
            quote_seq: v.quote_seq,
            epoch: m.epoch,
            decision_hash,
            bid_edge_bps,
            ask_edge_bps,
            bid_left_quote: bid_size_quote,
            ask_left_base: ask_size_base,
            posted_s: now,
            expires_s: now + ttl_s,
        };
        v.quote_live = option::some(q);
        event::emit(QuotePosted { vault, mandate_hash: m.mandate_hash, quote: q });
    }

    // Withdraw the standing quote. Moves no capital.
    public entry fun agent_cancel_quote(
        agent: &signer,
        vault: address,
        decision_hash: vector<u8>,
    ) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        let m = active_mandate(v, signer::address_of(agent));
        assert!(option::is_some(&v.quote_live), E_NO_QUOTE);
        let q = option::extract(&mut v.quote_live);
        event::emit(QuoteCancelled {
            vault,
            epoch: m.epoch,
            quote_seq: q.quote_seq,
            decision_hash,
            time_s: timestamp::now_seconds(),
        });
    }

    // ---------------------------------------------------------------- taker

    // Anyone can trade against the standing quote. The taker hands in one vault
    // asset and receives the other at the oracle price of this transaction,
    // reduced by the quoted edge. The vault checks every mandate limit itself.
    public entry fun take(
        taker: &signer,
        vault: address,
        taker_sells_base: bool,
        amount_in: u64,
        min_out: u64,
    ) acquires Vault {
        let v = borrow_global_mut<Vault>(vault);
        assert!(option::is_some(&v.mandate), E_NO_MANDATE);
        let m = *option::borrow(&v.mandate);
        assert!(!v.paused, E_PAUSED);
        assert!(!v.halted, E_HALTED);
        let now = timestamp::now_seconds();
        assert!(now >= m.valid_from_s, E_NOT_YET_VALID);
        assert!(now < m.valid_until_s, E_EXPIRED);

        assert!(option::is_some(&v.quote_live), E_NO_QUOTE);
        // A live quote always belongs to the current mandate and respects its
        // minimum edge: posting checks the edge, and set_mandate and
        // revoke_mandate clear the quote.
        let q = *option::borrow(&v.quote_live);
        assert!(now < q.expires_s, E_NO_QUOTE);
        let edge_bps = if (taker_sells_base) { q.bid_edge_bps } else { q.ask_edge_bps };

        let (p, pd, ts_ms) = price::read(v.pair);
        assert_fresh(ts_ms, m.max_oracle_age_s);

        let bd = fungible_asset::decimals(v.base);
        let qd = fungible_asset::decimals(v.quote);
        let base_before = primary_fungible_store::balance(vault, v.base);
        let quote_before = primary_fungible_store::balance(vault, v.quote);
        let nav_before = quote_before + price::quote_for_base(base_before, p, pd, bd, qd);
        assert!(nav_before >= m.nav_floor, E_NAV_FLOOR);
        let weight_before = weight_bps(base_before, quote_before, p, pd, bd, qd);

        let (notional, fair_out) = if (taker_sells_base) {
            let fq = price::quote_for_base(amount_in, p, pd, bd, qd);
            (fq, fq)
        } else {
            (amount_in, price::base_for_quote(amount_in, p, pd, bd, qd))
        };
        let amount_out = (((fair_out as u128) * ((BPS - edge_bps) as u128) / (BPS as u128)) as u64);
        assert!(amount_out > 0, E_ZERO_AMOUNT);
        assert!(amount_out >= min_out, E_MIN_OUT);
        assert!(notional <= m.max_notional_per_action, E_NOTIONAL_CAP);

        if (taker_sells_base) {
            assert!(amount_out <= q.bid_left_quote, E_QUOTE_SIZE);
            q.bid_left_quote = q.bid_left_quote - amount_out;
        } else {
            assert!(amount_out <= q.ask_left_base, E_QUOTE_SIZE);
            q.ask_left_base = q.ask_left_base - amount_out;
        };

        if (now >= v.window_start_s + DAY_SECS) {
            v.window_start_s = now;
            v.window_turnover = 0;
        };
        assert!(v.window_turnover + notional <= m.max_daily_turnover, E_DAILY_CAP);

        let (meta_in, meta_out) = if (taker_sells_base) { (v.base, v.quote) } else { (v.quote, v.base) };
        let fa_in = primary_fungible_store::withdraw(taker, meta_in, amount_in);
        primary_fungible_store::deposit(vault, fa_in);
        let vault_signer = object::generate_signer_for_extending(&v.extend_ref);
        let fa_out = primary_fungible_store::withdraw(&vault_signer, meta_out, amount_out);
        primary_fungible_store::deposit(signer::address_of(taker), fa_out);

        let base_after = primary_fungible_store::balance(vault, v.base);
        let quote_after = primary_fungible_store::balance(vault, v.quote);
        let nav_after = quote_after + price::quote_for_base(base_after, p, pd, bd, qd);
        let weight_after = weight_bps(base_after, quote_after, p, pd, bd, qd);
        let dist_before = band_distance(weight_before, m.min_base_weight_bps, m.max_base_weight_bps);
        let dist_after = band_distance(weight_after, m.min_base_weight_bps, m.max_base_weight_bps);
        assert!(dist_after == 0 || dist_after < dist_before, E_WEIGHT_BAND);

        v.quote_live = option::some(q);
        v.window_turnover = v.window_turnover + notional;
        v.total_turnover = v.total_turnover + notional;
        v.action_seq = v.action_seq + 1;

        event::emit(FillExecuted {
            vault,
            epoch: m.epoch,
            mandate_hash: m.mandate_hash,
            action_seq: v.action_seq,
            quote_seq: q.quote_seq,
            decision_hash: q.decision_hash,
            taker: signer::address_of(taker),
            vault_buys_base: taker_sells_base,
            amount_in,
            amount_out,
            fair_out,
            edge_bps,
            notional,
            oracle_price: p,
            oracle_decimals: pd,
            oracle_ts_ms: ts_ms,
            base_before,
            quote_before,
            base_after,
            quote_after,
            nav_before,
            nav_after,
            weight_before_bps: weight_before,
            weight_after_bps: weight_after,
            window_turnover: v.window_turnover,
            bid_left_quote: q.bid_left_quote,
            ask_left_base: q.ask_left_base,
            time_s: now,
        });
    }

    // ---------------------------------------------------------------- internal

    fun active_mandate(v: &Vault, caller: address): Mandate {
        assert!(option::is_some(&v.mandate), E_NO_MANDATE);
        let m = *option::borrow(&v.mandate);
        assert!(caller == m.agent, E_NOT_AGENT);
        assert!(!v.paused, E_PAUSED);
        assert!(!v.halted, E_HALTED);
        let now = timestamp::now_seconds();
        assert!(now >= m.valid_from_s, E_NOT_YET_VALID);
        assert!(now < m.valid_until_s, E_EXPIRED);
        assert!(option::is_some(&v.bond), E_NO_BOND);
        m
    }

    // Vault value now and the value of "deposits left untouched", both at the
    // same price. Withdrawals count as still there, deposits as the reference.
    fun result_values(b: &Bond, base_bal: u64, quote_bal: u64, p: u128, pd: u16, bd: u8, qd: u8): (u128, u128) {
        let now_base = (base_bal as u128) + (b.ref_base_out as u128);
        let value_now = price::value_of_base(now_base, p, pd, bd, qd) + (quote_bal as u128) + (b.ref_quote_out as u128);
        let value_ref = price::value_of_base((b.ref_base_in as u128), p, pd, bd, qd) + (b.ref_quote_in as u128);
        (value_now, value_ref)
    }

    fun fee_of(value_now: u128, value_ref: u128, fee_share_bps: u64): u128 {
        if (value_now > value_ref) { (value_now - value_ref) * (fee_share_bps as u128) / (BPS as u128) } else { 0 }
    }

    // Part of the bond that goes to the owner: loss divided by the covered
    // amount, capped at the whole bond.
    fun slash_of(value_now: u128, value_ref: u128, cover_bps: u64, bond_amount: u64): u64 {
        if (value_now >= value_ref) { return 0 };
        let loss = value_ref - value_now;
        let covered = value_ref * (cover_bps as u128) / (BPS as u128);
        if (loss >= covered) { bond_amount } else { (((bond_amount as u128) * loss / covered) as u64) }
    }

    fun assert_fresh(oracle_ts_ms: u64, max_age_s: u64) {
        let now_ms = timestamp::now_microseconds() / 1000;
        assert!(oracle_ts_ms + max_age_s * 1000 >= now_ms, E_ORACLE_STALE);
    }

    fun weight_bps(base_bal: u64, quote_bal: u64, p: u128, pd: u16, bd: u8, qd: u8): u64 {
        let base_value = (price::quote_for_base(base_bal, p, pd, bd, qd) as u128);
        let nav = base_value + (quote_bal as u128);
        if (nav == 0) { 0 } else { ((base_value * (BPS as u128) / nav) as u64) }
    }

    fun band_distance(w: u64, lo: u64, hi: u64): u64 {
        if (w < lo) { lo - w } else if (w > hi) { w - hi } else { 0 }
    }

    // ---------------------------------------------------------------- views

    #[view]
    public fun vault_address(owner: address, seed: vector<u8>): address {
        object::create_object_address(&owner, seed)
    }

    #[view]
    public fun get_state(vault: address): VaultState acquires Vault {
        let v = borrow_global<Vault>(vault);
        VaultState {
            owner: v.owner,
            base_balance: primary_fungible_store::balance(vault, v.base),
            quote_balance: primary_fungible_store::balance(vault, v.quote),
            paused: v.paused,
            halted: v.halted,
            epoch: v.epoch,
            action_seq: v.action_seq,
            attest_seq: v.attest_seq,
            window_start_s: v.window_start_s,
            window_turnover: v.window_turnover,
            total_turnover: v.total_turnover,
            last_action_s: v.last_action_s,
            has_mandate: option::is_some(&v.mandate),
            quote_seq: v.quote_seq,
            has_quote: option::is_some(&v.quote_live),
            bond_asset: object::object_address(&v.bond_asset),
            has_bond: option::is_some(&v.bond),
            pending_settlement: option::is_some(&v.pending),
        }
    }

    #[view]
    public fun get_quote(vault: address): Quote acquires Vault {
        let v = borrow_global<Vault>(vault);
        assert!(option::is_some(&v.quote_live), E_NO_QUOTE);
        *option::borrow(&v.quote_live)
    }

    #[view]
    public fun get_bond(vault: address): Bond acquires Vault {
        let v = borrow_global<Vault>(vault);
        assert!(option::is_some(&v.bond), E_NO_BOND);
        *option::borrow(&v.bond)
    }

    // Mandate that waits for its settlement after a revoke.
    #[view]
    public fun get_pending_mandate(vault: address): Mandate acquires Vault {
        let v = borrow_global<Vault>(vault);
        assert!(option::is_some(&v.pending), E_NO_MANDATE);
        *option::borrow(&v.pending)
    }

    #[view]
    public fun get_mandate(vault: address): Mandate acquires Vault {
        let v = borrow_global<Vault>(vault);
        assert!(option::is_some(&v.mandate), E_NO_MANDATE);
        *option::borrow(&v.mandate)
    }

    #[test_only]
    public fun mandate_id_for_test(vault: address): (u64, vector<u8>) acquires Vault {
        let m = *option::borrow(&borrow_global<Vault>(vault).mandate);
        (m.epoch, m.mandate_hash)
    }

    #[test_only]
    public fun balances_for_test(vault: address): (u64, u64) acquires Vault {
        let v = borrow_global<Vault>(vault);
        (primary_fungible_store::balance(vault, v.base), primary_fungible_store::balance(vault, v.quote))
    }

    #[test_only]
    public fun quote_left_for_test(vault: address): (u64, u64) acquires Vault {
        let q = *option::borrow(&borrow_global<Vault>(vault).quote_live);
        (q.bid_left_quote, q.ask_left_base)
    }

    #[test_only]
    public fun flags_for_test(vault: address): (bool, bool, u64, u64) acquires Vault {
        let v = borrow_global<Vault>(vault);
        (v.paused, v.halted, v.action_seq, v.window_turnover)
    }
}
