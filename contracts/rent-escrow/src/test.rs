#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, testutils::{Address as _, Events, Ledger}, token, Address, Env, IntoVal};

const TEST_DEADLINE: u64 = 2_000_000_000_u64;

fn setup_escrow(
    env: &Env,
) -> (
    RentEscrowContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
    token::Client<'_>,
) {
    env.mock_all_auths();

    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(env, &contract_id);

    let landlord = Address::generate(env);
    let roommate_a = Address::generate(env);
    let roommate_b = Address::generate(env);
    let token_admin = Address::generate(env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin.clone())
        .address();

    let sac = StellarAssetClient::new(env, &token_address);
    sac.mint(&roommate_a, &1000_i128);
    sac.mint(&roommate_b, &1000_i128);

    let mut roommate_shares = Map::new(env);
    roommate_shares.set(roommate_a.clone(), 500_i128);
    roommate_shares.set(roommate_b.clone(), 500_i128);

    client.initialize(
        &landlord,
        &token_address,
        &1000_i128,
        &TEST_DEADLINE,
        &roommate_shares,
    );

    let token = token::Client::new(env, &token_address);

    (client, landlord, roommate_a, roommate_b, token_address, token)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin.clone())
        .address();

    let mut roommate_shares: Map<Address, i128> = Map::new(&env);
    roommate_shares.set(Address::generate(&env), 500);
    roommate_shares.set(Address::generate(&env), 500);

    env.mock_all_auths();

    client.initialize(
        &landlord,
        &token_address,
        &1000_i128,
        &TEST_DEADLINE,
        &roommate_shares,
    );

    env.as_contract(&contract_id, || {
        let escrow: RentEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow)
            .expect("escrow should be stored after initialize");

        assert_eq!(escrow.landlord, landlord);
        assert_eq!(escrow.token, token_address);
    });
}

#[test]
fn test_get_deadline() {
    let env = Env::default();
    let (client, _, _, _, _, _) = setup_escrow(&env);

    assert_eq!(client.get_deadline(), TEST_DEADLINE);
}

#[test]
fn test_total_funded_zero_before_contributions() {
    let env = Env::default();
    let (client, _, _, _, _, _) = setup_escrow(&env);

    assert_eq!(client.get_total_funded(), 0_i128);
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

/// Issue #32 – release: succeeds when fully funded
///
/// Once every roommate

#[test]
fn test_share_sum_equals_rent_succeeds() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);
    let landlord = Address::generate(&env);
    let mut shares = Map::new(&env);
    shares.set(Address::generate(&env), 600_i128);
    shares.set(Address::generate(&env), 400_i128);
    env.mock_all_auths();
    client.initialize(&landlord, &1000_i128, &TEST_DEADLINE, &shares);
    assert_eq!(client.get_amount(), 1000_i128);
}

#[test]
fn test_reclaim_deposit_transfer() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, token) = setup_escrow(&env);

    client.contribute(&roommate_a, &500_i128);
    assert_eq!(token.balance(&roommate_a), 500_i128);

    client.refund(&roommate_a);

    let initial_balance = token.balance(&roommate_a);
    client.reclaim_deposit(&roommate_a);

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_double_refund_fails() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, _) = setup_escrow(&env);

    client.contribute(&roommate_a, &500_i128);
    client.refund(&roommate_a);
    client.refund(&roommate_a);
}

#[test]
fn test_release_transfers_tokens_to_landlord() {
    let env = Env::default();
    let (client, landlord, roommate_a, roommate_b, _, token) = setup_escrow(&env);

    client.contribute(&roommate_a, &500_i128);
    client.contribute(&roommate_b, &500_i128);

    assert_eq!(client.is_fully_funded(), true);

    let landlord_balance_before = token.balance(&landlord);
    client.release();
    let landlord_balance_after = token.balance(&landlord);

    assert_eq!(landlord_balance_after - landlord_balance_before, 1000_i128);
}

#[test]
fn test_full_flow_scenario() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);

    let landlord = Address::generate(&env);
    let roommate_a = Address::generate(&env);
    let roommate_b = Address::generate(&env);
    let roommate_c = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    token_admin_client.mint(&roommate_a, &1000_i128);
    token_admin_client.mint(&roommate_b, &1000_i128);
    token_admin_client.mint(&roommate_c, &1000_i128);

    let mut roommate_shares = Map::new(&env);
    roommate_shares.set(roommate_a.clone(), 400_i128);
    roommate_shares.set(roommate_b.clone(), 300_i128);
    roommate_shares.set(roommate_c.clone(), 300_i128);

    client.initialize(
        &landlord,
        &token_address,
        &1000_i128,
        &TEST_DEADLINE,
        &roommate_shares,
    );

    assert_eq!(client.get_landlord(), landlord);
    assert_eq!(client.get_amount(), 1000_i128);
    assert_eq!(client.is_fully_funded(), false);

    client.contribute(&roommate_a, &400_i128);
    assert_eq!(client.get_balance(&roommate_a), 400_i128);
    assert_eq!(client.get_total_funded(), 400_i128);
    assert_eq!(token.balance(&client.address), 400_i128);

    client.contribute(&roommate_b, &300_i128);
    assert_eq!(client.get_balance(&roommate_b), 300_i128);
    assert_eq!(client.get_total_funded(), 700_i128);

    client.contribute(&roommate_c, &300_i128);
    assert_eq!(client.get_balance(&roommate_c), 300_i128);
    assert_eq!(client.get_total_funded(), 1000_i128);

    assert_eq!(client.is_fully_funded(), true);
    assert_eq!(token.balance(&client.address), 1000_i128);

    client.release();

    assert_eq!(token.balance(&landlord), 1000_i128);
    assert_eq!(token.balance(&client.address), 0_i128);
}
#[test]
fn test_contribute_emits_event() {
    let env = Env::default();
    let (client, _, roommate_a, _, _, _) = setup_escrow(&env);

    client.contribute(&roommate_a, &300_i128);

    let events = env.events().all().all(); // First .all() returns ContractEvents, second .all() returns Vec
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event,
        (
            client.address.clone(),
            (symbol_short!("deposit"), roommate_a).into_val(&env),
            300_i128.into_val(&env)
        )
    );
}

#[test]
fn test_initialize_invalid_rent_amount() {
    let env = Env::default();
    let contract_id = env.register(RentEscrowContract, ());
    let client = RentEscrowContractClient::new(&env, &contract_id);
    let landlord = Address::generate(&env);
    let token = Address::generate(&env);
    let mut shares = Map::new(&env);
    
    env.mock_all_auths();

    // Test with 0 rent
    let result = client.try_initialize(&landlord, &token, &0, &TEST_DEADLINE, &shares);
    assert_eq!(result.err(), Some(Ok(Error::InvalidAmount)));

    // Test with MIN_RENT
    let result = client.try_initialize(&landlord, &token, &MIN_RENT, &TEST_DEADLINE, &shares);
    assert_eq!(result.err(), Some(Ok(Error::InvalidAmount)));

    // Test with MIN_RENT + 1 (should succeed)
    client.initialize(&landlord, &token, &(MIN_RENT + 1), &TEST_DEADLINE, &shares);
}
