#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, token, Address, Env, Map};

/// Minimum rent amount in stroops/token-units to prevent micro-escrow spam
pub const MIN_RENT: i128 = 100;

/// Number of ledgers in a day, assuming ~5-second ledger close times
/// (24 * 60 * 60) / 5 = 17280
pub const DAY_IN_LEDGERS: u32 = 17280;

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
}

/// Storage key definitions for persistent contract state.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Escrow,
    Deadline,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoommateState {
    pub expected: i128,
    pub paid: i128,
}

/// The rent escrow data structure.
#[contracttype]
#[derive(Clone)]
pub struct RentEscrow {
    pub landlord: Address,
    pub token: Address,
    pub rent_amount: i128,
    pub roommates: Map<Address, RoommateState>,
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
        rent_amount: i128,
        deadline: u64,
        roommates: Map<Address, i128>,
    ) -> Result<(), Error> {
        landlord.require_auth();

        if rent_amount <= 0 {
            return Err(Error::InvalidAmount);
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
            rent_amount,
            roommates: roommate_states,
        });

        env.storage().persistent().set(&DataKey::Deadline, &deadline);

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

        env.storage().persistent().set(&DataKey::Escrow, &escrow);

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
        Ok(())
    }

    /// Retrieve the landlord address.
    pub fn get_landlord(env: Env) -> Address {
        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");
        escrow.landlord
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

    /// Allow roommates to reclaim deposits after deadline.
    pub fn claim_refund(env: Env, from: Address) -> Result<(), Error> {
        from.require_auth();

        let deadline: u64 = env.storage()
            .persistent()
            .get(&DataKey::Deadline)
            .expect("escrow not initialized");

        if env.ledger().timestamp() < deadline {
            return Err(Error::DeadlineNotReached);
        }

        let escrow: RentEscrow = env.storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow not initialized");

        if !escrow.roommates.contains_key(from.clone()) {
            return Err(Error::Unauthorized);
        }

        // TODO: Transfer token back to user

        Ok(())
    }
}

#[cfg(test)]
mod test;
