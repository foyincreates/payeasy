#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, symbol_short, token, Address, Env, Map, Symbol};

/// Minimum rent amount in stroops/token-units to prevent micro-escrow spam
pub const MIN_RENT: i128 = 100;

/// Number of ledgers in a day, assuming ~5-second ledger close times
/// (24 * 60 * 60) / 5 = 17280
pub const DAY_IN_LEDGERS: u32 = 17280;

pub const BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
pub const BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;

/// Error types for the rent escrow contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    InvalidAmount = 1,
    InsufficientFunding = 2,
    /// Caller is not a registered roommate in this escrow.
    Unauthorized = 3,
    /// Refunds are not available until the deadline has passed.
    DeadlineNotReached = 4,
    /// The sum of all roommate shares exceeds the total rent amount.
    ShareSumExceedsRent = 5,
    /// No funds to refund for this roommate.
    NothingToRefund = 6,
}

/// Storage key definitions for persistent contract state.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Escrow,
    Deadline,
    /// Maps a roommate Address to their expected rent share (i128).
    Shares(Address),
    /// Maps a roommate Address to their total contributed amount (i128).
    Contributions(Address),
}

/// Tracks an individual roommate's rent obligation and payment progress.
///
/// Stored per-roommate in the escrow using `DataKey::Escrow` inside the
/// `RentEscrow.roommates` map, keyed by the roommate's `Address`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoommateState {
    /// The roommate's expected rent share in token units (i128).
    pub expected: i128,
    /// The cumulative amount the roommate has contributed so far (i128).
    pub paid: i128,
}

/// The rent escrow data structure.
#[contracttype]
#[derive(Clone)]
pub struct RentEscrow {
    pub landlord: Address,
    pub token: Address,
    pub token_address: Address,
    pub rent_amount: i128,
    pub roommates: Map<Address, RoommateState>,
}

#[contractevent]
#[derive(Clone, Default, Debug, Eq, PartialEq)]
pub struct AgreementReleased {
    pub amount: i128,
}

#[contract]
pub struct RentEscrowContract;

#[contractimpl]
impl RentEscrowContract {
    /// Initialize the escrow with landlord, token, rent amount, deadline, and roommates.
    pub fn initialize(
        env: Env,
        landlord: Address,
        token: Address,
    pub fn initialize(
        env: Env,
        landlord: Address,
        token: Address,
    /// Initialize the escrow with landlord, rent amount, and roommates.
    ///
    /// Reverts if `landlord` is the contract itself.
    ///
    /// Persists the escrow state to ledger storage so that the values
    /// survive across invocations and ledger closes.
    pub fn initialize(
        env: Env,
        landlord: Address,
        token_address: Address,
        rent_amount: i128,
        deadline: u64,
        roommates: Map<Address, i128>,
    ) -> Result<(), Error> {
        // Zero-address guard: landlord must not be the contract itself
        if landlord == env.current_contract_address() {
            panic!("landlord cannot be the contract itself");
        }

        landlord.require_auth();

        if rent_amount < MIN_RENT {
            return Err(Error::InvalidAmount);
        }

        let mut share_sum: i128 = 0;
        for (_, share) in roommates.iter() {
            share_sum += share;
        }
        if share_sum > rent_amount {
            return Err(Error::ShareSumExceedsRent);
        }

        let mut roommate_states = Map::new(&env);
        for (address, expected) in roommates.iter() {
            roommate_states.set(address, RoommateState {
                expected,
                paid: 0,
            });
        }

        env.storage().persistent().set(&DataKey::Escrow, &RentEscrow {
            landlord,
            token,
            token_address,
            rent_amount,
            roommates: roommate_states,
        });

        env.storage().persistent().set(&DataKey::Deadline, &deadline);

        env.storage().persistent().extend_ttl(&DataKey::Escrow, BUMP_THRESHOLD, BUMP_AMOUNT);
        env.storage().persistent().extend_ttl(&DataKey::Deadline, BUMP_THRESHOLD, BUMP_AMOUNT);

        Ok(())
    }

    /// Allows the landlord to register a new roommate and their expected share.
    pub fn add_roommate(
        env: Env,
        landlord: Address,
        user: Address,
        share: i128,
    ) -> Result<(), Error> {
        landlord.require_auth();

        if share <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        if escrow.landlord != landlord {
            return Err(Error::Unauthorized);
        }

        escrow.roommates.set(user, RoommateState {
            expected: share,
            paid: 0,
        });

        env.storage().persistent().set(&DataKey::Escrow, &escrow);
        env.storage().persistent().extend_ttl(&DataKey::Escrow, BUMP_THRESHOLD, BUMP_AMOUNT);

        Ok(())
    }

    /// Roommates call this to contribute their share of the rent.
    pub fn contribute(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        from.require_auth();

        let mut escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        if !escrow.roommates.contains_key(from.clone()) {
            return Err(Error::Unauthorized);
        }

        let token_client = token::TokenClient::new(&env, &escrow.token);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        let mut state = escrow.roommates.get(from.clone()).unwrap();
        state.paid += amount;
        escrow.roommates.set(from.clone(), state);

        let token_client = token::Client::new(&env, &escrow.token_address);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        env.storage().persistent().set(&DataKey::Escrow, &escrow);
        env.storage().persistent().extend_ttl(&DataKey::Escrow, BUMP_THRESHOLD, BUMP_AMOUNT);

        env.events().publish(
            (symbol_short!("deposit"), from),
            amount,
        );

        Ok(())
    }

    /// Refund a roommate's contributed balance back to them.
    pub fn refund(env: Env, roommate: Address) -> Result<(), Error> {
        roommate.require_auth();
        let mut escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");
        let state = escrow.roommates.get(roommate.clone()).ok_or(Error::Unauthorized)?;
        let contributed = state.paid;
        if contributed <= 0 {
            return Err(Error::NothingToRefund);
        }
        let mut new_state = state.clone();
        new_state.paid = 0;
        escrow.roommates.set(roommate.clone(), new_state);
        env.storage().persistent().set(&DataKey::Escrow, &escrow);
        let token_client = token::TokenClient::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &roommate, &contributed);
        Ok(())
    }

    /// Calculate the total amount funded by all roommates.
    pub fn get_total_funded(env: Env) -> i128 {
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        let mut total: i128 = 0;
        for (_, state) in escrow.roommates.iter() {
            total += state.paid;
        }
        total
    }

    /// Check whether the total contributions meet or exceed the rent goal.
    pub fn is_fully_funded(env: Env) -> bool {
        let total_funded = Self::get_total_funded(env.clone());
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        total_funded >= escrow.rent_amount
    }

    /// Release total rent to the landlord if fully funded.
    pub fn release(env: Env) -> Result<(), Error> {
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");
        let token_client = token::TokenClient::new(&env, &escrow.token);
        let balance = token_client.balance(&env.current_contract_address());
        if balance < escrow.rent_amount {
            return Err(Error::InsufficientFunding);
        }
        token_client.transfer(&env.current_contract_address(), &escrow.landlord, &balance);

        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        let total_funded = Self::get_total_funded(env.clone());
        let token_client = token::Client::new(&env, &escrow.token_address);
        token_client.transfer(&env.current_contract_address(), &escrow.landlord, &total_funded);

        env.storage().persistent().extend_ttl(&DataKey::Escrow, BUMP_THRESHOLD, BUMP_AMOUNT);
        env.storage().persistent().extend_ttl(&DataKey::Deadline, BUMP_THRESHOLD, BUMP_AMOUNT);
        env.events().publish_event(&AgreementReleased {
            amount: total_funded,
        });

        Ok(())
    }

    /// Landlord-initiated refund of a specific roommate's contributed tokens.
    pub fn refund(env: Env, roommate: Address) -> Result<i128, Error> {
        let landlord: Address = Self::get_landlord(env.clone());
        landlord.require_auth();

        let mut escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        let mut state = escrow.roommates.get(roommate.clone()).ok_or(Error::Unauthorized)?;
        let refund_amount = state.paid;

        if refund_amount <= 0 {
            return Err(Error::NothingToRefund);
        }

        state.paid = 0;
        escrow.roommates.set(roommate.clone(), state);
        env.storage().persistent().set(&DataKey::Escrow, &escrow);

        let token_client = token::Client::new(&env, &escrow.token_address);
        token_client.transfer(&env.current_contract_address(), &roommate, &refund_amount);

        Ok(refund_amount)
    }

    /// Retrieve the landlord address.
    pub fn get_landlord(env: Env) -> Address {
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");
        escrow.landlord
    }

    /// Retrieve the token address.
    pub fn get_token_address(env: Env) -> Address {
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");
        escrow.token_address
    }

    /// Retrieve the rent amount.
    pub fn get_amount(env: Env) -> i128 {
        let result: Option<RentEscrow> = env.storage()
            .persistent()
            .get(&DataKey::Escrow);
        match result {
            Some(escrow) => escrow.rent_amount,
            None => 0,
        }
    }

    /// Retrieve the paid balance for a specific roommate.
    pub fn get_balance(env: Env, from: Address) -> i128 {
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        match escrow.roommates.get(from) {
            Some(state) => state.paid,
            None => 0,
        }
    }

    /// Retrieve the deadline timestamp.
    pub fn get_deadline(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::Deadline)
            .expect("escrow not initialized")
    }

    /// Return the total rent amount set at initialization.
    pub fn get_total(env: Env) -> i128 {
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");
        escrow.rent_amount
    }

    /// Allow roommates to reclaim deposits after deadline.
    pub fn reclaim_deposit(env: Env, from: Address) -> Result<(), Error> {
        from.require_auth();

        let deadline: u64 = env.storage()
            .persistent()
            .get(&DataKey::Deadline)
            .expect("escrow not initialized");

        if env.ledger().timestamp() < deadline {
            return Err(Error::DeadlineNotReached);
        }

        let mut escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        let mut state = escrow.roommates.get(from.clone()).ok_or(Error::Unauthorized)?;
        let refund_amount = state.paid;
        
        if refund_amount == 0 {
            return Ok(());
        }

        state.paid = 0;
        escrow.roommates.set(from.clone(), state);

        env.storage().persistent().set(&DataKey::Escrow, &escrow);

        let token_client = token::Client::new(&env, &escrow.token_address);
        token_client.transfer(&env.current_contract_address(), &from, &refund_amount);

        env.storage().persistent().extend_ttl(&DataKey::Escrow, BUMP_THRESHOLD, BUMP_AMOUNT);
        env.storage().persistent().extend_ttl(&DataKey::Deadline, BUMP_THRESHOLD, BUMP_AMOUNT);

        Ok(())
    }

    /// Upgrades the contract's WASM code. Only the landlord can call this.
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) -> Result<(), Error> {
        let landlord: Address = Self::get_landlord(env.clone());
        landlord.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }
}

#[cfg(test)]
mod test;
