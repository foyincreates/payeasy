#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, token, Address, Env};

const TEST_DEADLINE: u64 = 2_000_000_000_u64;

fn setup_escrow(env: &Env) -> (RentEscrowContractClient<'_>, Address, Address, Address, Address, token::Client<'_>) {
    env.mock_all_auths();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(env, &contract_id);

    let landlord = Address::generate(env);
    let roommate_a = Address::generate(env);
    let roommate_b = Address::generate(env);
    
    let token_admin = Address::generate(env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token = token::Client::new(env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(env, &token_address);

    token_admin_client.mint(&roommate_a, &1000_i128);
    token_admin_client.mint(&roommate_b, &1000_i128);

    let mut roommate_shares = Map::new(env);
    roommate_shares.set(roommate_a.clone(), 500_i128);
    roommate_shares.set(roommate_b.clone(), 500_i128);

    client.initialize(&landlord, &token_address, &1000_i128, &TEST_DEADLINE, &roommate_shares);

    (client, landlord, roommate_a, roommate_b, token_address, token)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let landlord = Address::generate(&env);
    let token_address = Address::generate(&env);
    let mut roommate_shares: Map<Address, i128> = Map::new(&env);
    roommate_shares.set(Address::generate(&env), 500);
    roommate_shares.set(Address::generate(&env), 500);

    env.mock_all_auths();
    client.initialize(&landlord, &token_address, &1000_i128, &TEST_DEADLINE, &roommate_shares);

    env.as_contract(&contract_id, || {
        let escrow: RentEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow should be stored after initialize");

        assert_eq!(escrow.landlord, landlord);
        assert_eq!(escrow.token_address, token_address);
    });
}

#[test]
fn test_get_deadline() {
    let env = Env::default();
    let (client, _, _, _, _, _) = setup_escrow(&env);

    assert_eq!(client.get_deadline(), TEST_DEADLINE);
}

#[test]
fn test_total_funded_after_partial_contributions() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, token) = setup_escrow(&env);

    client.contribute(&roommate_a, &300_i128);

    assert_eq!(client.get_total_funded(), 300_i128);
    assert_eq!(client.is_fully_funded(), false);
    assert_eq!(token.balance(&client.address), 300_i128);
}

#[test]
fn test_total_funded_after_all_contributions() {
    let env = Env::default();
    let (client, _, roommate_a, roommate_b, _, token) = setup_escrow(&env);

    client.contribute(&roommate_a, &500_i128);
    client.contribute(&roommate_b, &500_i128);

    assert_eq!(client.get_total_funded(), 1000_i128);
    assert_eq!(client.is_fully_funded(), true);
    assert_eq!(token.balance(&client.address), 1000_i128);
}

#[test]
fn test_is_fully_funded_with_overfunding() {
    let env = Env::default();
    let (client, _, roommate_a, roommate_b, _, _) = setup_escrow(&env);

    client.contribute(&roommate_a, &600_i128);
    client.contribute(&roommate_b, &500_i128);

    assert_eq!(client.get_total_funded(), 1100_i128);
    assert_eq!(client.is_fully_funded(), true);
}

#[test]
fn test_get_balance() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, _) = setup_escrow(&env);

    assert_eq!(client.get_balance(&roommate_a), 0_i128);

    client.contribute(&roommate_a, &200_i128);
    assert_eq!(client.get_balance(&roommate_a), 200_i128);

    client.contribute(&roommate_a, &150_i128);
    assert_eq!(client.get_balance(&roommate_a), 350_i128);
}

#[test]
fn test_stranger_contribute_fails() {
    let env = Env::default();
    let (client, _, _, _, _, _) = setup_escrow(&env);

    let stranger = Address::generate(&env);

    let result = client.try_contribute(&stranger, &100_i128);
    assert!(
        result.is_err(),
        "expected contribute to fail for an unregistered address"
    );
}

#[test]
fn test_add_roommate_by_landlord_succeeds() {
    let env = Env::default();
    let (client, landlord, _, _, token_address, _) = setup_escrow(&env);

    let new_roommate = Address::generate(&env);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);
    token_admin_client.mint(&new_roommate, &1000_i128);

    client.add_roommate(&landlord, &new_roommate, &250_i128);

    assert_eq!(client.get_balance(&new_roommate), 0_i128);

    client.contribute(&new_roommate, &100_i128);
    assert_eq!(client.get_balance(&new_roommate), 100_i128);
}

#[test]
fn test_add_roommate_by_non_landlord_fails() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, _) = setup_escrow(&env);

    let new_roommate = Address::generate(&env);

    let result = client.try_add_roommate(&roommate_a, &new_roommate, &250_i128);
    assert!(
        result.is_err(),
        "expected add_roommate to fail for a non-landlord caller"
    );
}

#[test]
fn test_release_while_underfunded_fails() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, _) = setup_escrow(&env);

    client.contribute(&roommate_a, &300_i128);

    assert_eq!(client.is_fully_funded(), false);

    let result = client.try_release();
    assert!(
        result.is_err(),
        "expected release to fail when escrow is underfunded"
    );
}

#[test]
fn test_release_transfer() {
    let env = Env::default();
    let (client, landlord, roommate_a, roommate_b, _, token) = setup_escrow(&env);

    client.contribute(&roommate_a, &500_i128);
    client.contribute(&roommate_b, &500_i128);

    client.release();

    assert_eq!(token.balance(&landlord), 1000_i128);
    assert_eq!(token.balance(&client.address), 0_i128);
}

#[test]
fn test_claim_refund_transfer() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, token) = setup_escrow(&env);

    client.contribute(&roommate_a, &300_i128);

    // Fast forward time past deadline
    env.ledger().set_timestamp(TEST_DEADLINE + 1);

    let initial_balance = token.balance(&roommate_a);
    client.claim_refund(&roommate_a);

    assert_eq!(token.balance(&roommate_a), initial_balance + 300_i128);
    assert_eq!(token.balance(&client.address), 0_i128);
    assert_eq!(client.get_balance(&roommate_a), 0_i128);
}

#[test]
fn test_initialize_rejects_below_min_rent() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let landlord = Address::generate(&env);
    let token_address = Address::generate(&env);
    let roommate = Address::generate(&env);

    let mut roommate_shares = Map::new(&env);
    roommate_shares.set(roommate.clone(), 50_i128);

    env.mock_all_auths();
    // rent_amount below MIN_RENT (100) must return InvalidAmount
    let result = client.try_initialize(&landlord, &token_address, &50_i128, &TEST_DEADLINE, &roommate_shares);
    assert!(result.is_err());
}

#[test]
fn test_initialize_accepts_min_rent() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let landlord = Address::generate(&env);
    let token_address = Address::generate(&env);
    let roommate = Address::generate(&env);

    let mut roommate_shares = Map::new(&env);
    roommate_shares.set(roommate.clone(), 100_i128);

    env.mock_all_auths();
    // rent_amount exactly at MIN_RENT (100) must succeed
    client.initialize(&landlord, &token_address, &100_i128, &TEST_DEADLINE, &roommate_shares);
}

#[test]
fn test_initialize_valid_landlord() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let landlord = Address::generate(&env);
    let token_address = Address::generate(&env);
    let roommate = Address::generate(&env);

    let mut roommate_shares = Map::new(&env);
    roommate_shares.set(roommate.clone(), 1000_i128);

    env.mock_all_auths();
    // Should succeed with a valid (non-contract) landlord address
    client.initialize(&landlord, &token_address, &1000_i128, &TEST_DEADLINE, &roommate_shares);
}

#[test]
#[should_panic(expected = "landlord cannot be the contract itself")]
fn test_initialize_reverts_when_landlord_is_contract() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let token_address = Address::generate(&env);
    let roommate = Address::generate(&env);

    let mut roommate_shares = Map::new(&env);
    roommate_shares.set(roommate.clone(), 1000_i128);

    env.mock_all_auths();
    // Passing the contract's own address as landlord must revert
    client.initialize(&contract_id, &token_address, &1000_i128, &TEST_DEADLINE, &roommate_shares);
}
