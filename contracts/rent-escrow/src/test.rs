#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env};

const TEST_DEADLINE: u64 = 2_000_000_000_u64;

fn setup_escrow(env: &Env) -> (RentEscrowContractClient<'_>, Address, Address, Address) {
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(env, &contract_id);

    let landlord = Address::generate(env);
    let roommate_a = Address::generate(env);
    let roommate_b = Address::generate(env);

    let mut roommate_shares = Map::new(env);
    roommate_shares.set(roommate_a.clone(), 500_i128);
    roommate_shares.set(roommate_b.clone(), 500_i128);

    env.mock_all_auths();
    client.initialize(&landlord, &1000_i128, &TEST_DEADLINE, &roommate_shares);

    (client, landlord, roommate_a, roommate_b)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let landlord = Address::generate(&env);
    let mut roommate_shares: Map<Address, i128> = Map::new(&env);
    roommate_shares.set(Address::generate(&env), 500);
    roommate_shares.set(Address::generate(&env), 500);

    env.mock_all_auths();
    client.initialize(&landlord, &1000_i128, &roommate_shares);

    env.as_contract(&contract_id, || {
        let escrow: RentEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow should be stored after initialize");

        assert_eq!(escrow.landlord, landlord);
    });
}

#[test]
fn test_get_deadline() {
    let env = Env::default();
    let (client, _, _, _) = setup_escrow(&env);

    assert_eq!(client.get_deadline(), TEST_DEADLINE);
}

#[test]
fn test_total_funded_zero_before_contributions() {
    let env = Env::default();
    let (client, _, _, _) = setup_escrow(&env);

    assert_eq!(client.get_total_funded(), 0_i128);
}

#[test]
fn test_total_funded_after_partial_contributions() {
    let env = Env::default();
    let (client, _, roommate_a, _) = setup_escrow(&env);

    client.contribute(&roommate_a, &300_i128);

    assert_eq!(client.get_total_funded(), 300_i128);
    assert_eq!(client.is_fully_funded(), false);
}

#[test]
fn test_total_funded_after_all_contributions() {
    let env = Env::default();
    let (client, _, roommate_a, roommate_b) = setup_escrow(&env);

    client.contribute(&roommate_a, &500_i128);
    client.contribute(&roommate_b, &500_i128);

    assert_eq!(client.get_total_funded(), 1000_i128);
    assert_eq!(client.is_fully_funded(), true);
}

#[test]
fn test_is_fully_funded_with_overfunding() {
    let env = Env::default();
    let (client, _, roommate_a, roommate_b) = setup_escrow(&env);

    client.contribute(&roommate_a, &600_i128);
    client.contribute(&roommate_b, &500_i128);

    assert_eq!(client.get_total_funded(), 1100_i128);
    assert_eq!(client.is_fully_funded(), true);
}

#[test]
fn test_get_balance() {
    let env = Env::default();
    let (client, _, roommate_a, _) = setup_escrow(&env);

    assert_eq!(client.get_balance(&roommate_a), 0_i128);

    client.contribute(&roommate_a, &200_i128);
    assert_eq!(client.get_balance(&roommate_a), 200_i128);

    client.contribute(&roommate_a, &150_i128);
    assert_eq!(client.get_balance(&roommate_a), 350_i128);
}

/// Issue #27 – Roommate Membership Check
///
/// A stranger (address never registered as a roommate) must not be able to
/// call `contribute`. The contract must revert with `Error::Unauthorized`.
#[test]
fn test_stranger_contribute_fails() {
    let env = Env::default();
    let (client, _, _, _) = setup_escrow(&env);

    let stranger = Address::generate(&env);

    // The contract should panic/revert because `stranger` is not in the
    // roommate map, triggering Error::Unauthorized (code 3).
    let result = client.try_contribute(&stranger, &100_i128);
    assert!(
        result.is_err(),
        "expected contribute to fail for an unregistered address"
    );
}

/// Issue #21 – add_roommate: success path
///
/// The landlord can register a brand-new roommate after initialisation.
/// The new address should then be visible through `get_balance`.
#[test]
fn test_add_roommate_by_landlord_succeeds() {
    let env = Env::default();
    let (client, landlord, _, _) = setup_escrow(&env);

    let new_roommate = Address::generate(&env);

    // Landlord adds a new roommate with a share of 250.
    client.add_roommate(&landlord, &new_roommate, &250_i128);

    // Newly added roommate starts with no paid balance.
    assert_eq!(client.get_balance(&new_roommate), 0_i128);

    // After contributing, their balance should reflect the payment.
    client.contribute(&new_roommate, &100_i128);
    assert_eq!(client.get_balance(&new_roommate), 100_i128);
}

/// Issue #21 – add_roommate: non-landlord call must fail
///
/// Any caller whose address is not the stored landlord must be rejected
/// with `Error::Unauthorized`.
#[test]
fn test_add_roommate_by_non_landlord_fails() {
    let env = Env::default();
    let (client, _, roommate_a, _) = setup_escrow(&env);

    let new_roommate = Address::generate(&env);

    // roommate_a is not the landlord — this must revert.
    let result = client.try_add_roommate(&roommate_a, &new_roommate, &250_i128);
    assert!(
        result.is_err(),
        "expected add_roommate to fail for a non-landlord caller"
    );
}

/// Issue #32 – release: underfunded guard (acceptance criteria)
///
/// `release` must revert with `Error::InsufficientFunding` when total
/// contributions have not yet reached the rent target, preventing any
/// premature payout to the landlord.
#[test]
fn test_release_while_underfunded_fails() {
    let env = Env::default();
    let (client, _, roommate_a, _) = setup_escrow(&env);

    // Only roommate_a pays a partial amount — total funded = 300, target = 1000.
    client.contribute(&roommate_a, &300_i128);

    assert_eq!(client.is_fully_funded(), false);

    let result = client.try_release();
    assert!(
        result.is_err(),
        "expected release to fail when escrow is underfunded"
    );
}

/// Issue #32 – release: succeeds when fully funded
///
/// Once every roommate