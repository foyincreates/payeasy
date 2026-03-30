#!/usr/bin/env bash
set -euo pipefail

NETWORK_NAME="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

ASSET_CODE="${1:-PYEASY}"
MINT_AMOUNT="${2:-1000}"
TRANSFER_AMOUNT="${3:-250}"

if ! command -v stellar >/dev/null 2>&1; then
  echo "error: stellar CLI is required. Install it from https://developers.stellar.org/docs/tools/cli" >&2
  exit 1
fi

if [[ ${#ASSET_CODE} -lt 1 || ${#ASSET_CODE} -gt 12 ]]; then
  echo "error: asset code must be 1-12 characters." >&2
  exit 1
fi

if ! [[ "$MINT_AMOUNT" =~ ^[0-9]+$ ]]; then
  echo "error: mint amount must be an integer." >&2
  exit 1
fi

if ! [[ "$TRANSFER_AMOUNT" =~ ^[0-9]+$ ]]; then
  echo "error: transfer amount must be an integer." >&2
  exit 1
fi

if (( TRANSFER_AMOUNT > MINT_AMOUNT )); then
  echo "error: transfer amount cannot exceed mint amount." >&2
  exit 1
fi

TIMESTAMP="$(date +%s)"
ISSUER_ALIAS="issuer-$TIMESTAMP"
USER1_ALIAS="roommate1-$TIMESTAMP"
USER2_ALIAS="roommate2-$TIMESTAMP"
CONTRACT_ALIAS="${ASSET_CODE,,}-$TIMESTAMP"

CONFIG_DIR="${STELLAR_CONFIG_DIR:-$(mktemp -d)}"
AUTO_CONFIG_DIR="0"
if [[ -z "${STELLAR_CONFIG_DIR:-}" ]]; then
  AUTO_CONFIG_DIR="1"
fi

cleanup() {
  if [[ "$AUTO_CONFIG_DIR" == "1" ]]; then
    rm -rf "$CONFIG_DIR"
  fi
}
trap cleanup EXIT

STELLAR=(stellar --config-dir "$CONFIG_DIR")

log() {
  printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$1"
}

run_cmd() {
  "$@" >/dev/null
}

ensure_network() {
  if ! "${STELLAR[@]}" network ls | awk '{print $1}' | grep -Fxq "$NETWORK_NAME"; then
    "${STELLAR[@]}" network add "$NETWORK_NAME" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" >/dev/null
  fi
}

public_key() {
  "${STELLAR[@]}" keys public-key "$1"
}

secret_key() {
  "${STELLAR[@]}" keys secret "$1"
}

log "Configuring network and generating test accounts"
ensure_network
run_cmd "${STELLAR[@]}" network use "$NETWORK_NAME"

run_cmd "${STELLAR[@]}" keys generate "$ISSUER_ALIAS"
run_cmd "${STELLAR[@]}" keys generate "$USER1_ALIAS"
run_cmd "${STELLAR[@]}" keys generate "$USER2_ALIAS"

# Uses Stellar friendbot under the hood for testnet funding.
run_cmd "${STELLAR[@]}" keys fund "$ISSUER_ALIAS" --network "$NETWORK_NAME"
run_cmd "${STELLAR[@]}" keys fund "$USER1_ALIAS" --network "$NETWORK_NAME"
run_cmd "${STELLAR[@]}" keys fund "$USER2_ALIAS" --network "$NETWORK_NAME"

ISSUER_PUBLIC="$(public_key "$ISSUER_ALIAS")"
USER1_PUBLIC="$(public_key "$USER1_ALIAS")"
USER2_PUBLIC="$(public_key "$USER2_ALIAS")"

ASSET="${ASSET_CODE}:${ISSUER_ALIAS}"

log "Configuring issuer flags and trustlines"
run_cmd "${STELLAR[@]}" tx new set-options \
  --network "$NETWORK_NAME" \
  --source "$ISSUER_ALIAS" \
  --set-revocable \
  --set-clawback-enabled

run_cmd "${STELLAR[@]}" tx new change-trust \
  --network "$NETWORK_NAME" \
  --source "$USER1_ALIAS" \
  --line "$ASSET" \
  --limit "$MINT_AMOUNT"

run_cmd "${STELLAR[@]}" tx new change-trust \
  --network "$NETWORK_NAME" \
  --source "$USER2_ALIAS" \
  --line "$ASSET" \
  --limit "$MINT_AMOUNT"

log "Deploying Stellar Asset Contract"
run_cmd "${STELLAR[@]}" contract asset deploy \
  --network "$NETWORK_NAME" \
  --source "$ISSUER_ALIAS" \
  --asset "$ASSET" \
  --alias "$CONTRACT_ALIAS"

CONTRACT_ID="$("${STELLAR[@]}" contract id asset --network "$NETWORK_NAME" --asset "$ASSET")"

log "Minting and distributing test tokens"
run_cmd "${STELLAR[@]}" contract invoke \
  --network "$NETWORK_NAME" \
  --source "$ISSUER_ALIAS" \
  --id "$CONTRACT_ALIAS" \
  -- mint \
  --to "$USER1_ALIAS" \
  --amount "$MINT_AMOUNT"

run_cmd "${STELLAR[@]}" contract invoke \
  --network "$NETWORK_NAME" \
  --source "$USER1_ALIAS" \
  --id "$CONTRACT_ALIAS" \
  -- transfer \
  --from "$USER1_ALIAS" \
  --to "$USER2_ALIAS" \
  --amount "$TRANSFER_AMOUNT"

USER1_BALANCE_RAW="$("${STELLAR[@]}" contract invoke --network "$NETWORK_NAME" --id "$CONTRACT_ALIAS" -- balance --id "$USER1_ALIAS")"
USER2_BALANCE_RAW="$("${STELLAR[@]}" contract invoke --network "$NETWORK_NAME" --id "$CONTRACT_ALIAS" -- balance --id "$USER2_ALIAS")"

USER1_BALANCE="$(echo "$USER1_BALANCE_RAW" | tr -d '[:space:]"')"
USER2_BALANCE="$(echo "$USER2_BALANCE_RAW" | tr -d '[:space:]"')"

EXPECTED_USER1=$((MINT_AMOUNT - TRANSFER_AMOUNT))
EXPECTED_USER2=$TRANSFER_AMOUNT

if [[ "$USER1_BALANCE" != "$EXPECTED_USER1" || "$USER2_BALANCE" != "$EXPECTED_USER2" ]]; then
  echo "error: balance verification failed." >&2
  echo "expected user1=$EXPECTED_USER1 user2=$EXPECTED_USER2" >&2
  echo "actual   user1=$USER1_BALANCE user2=$USER2_BALANCE" >&2
  exit 1
fi

cat <<REPORT

Minting complete.

Network: $NETWORK_NAME
Asset: ${ASSET_CODE}:${ISSUER_PUBLIC}
Token contract ID: $CONTRACT_ID
Contract alias: $CONTRACT_ALIAS

Accounts:
- Issuer
  - Alias: $ISSUER_ALIAS
  - Public: $ISSUER_PUBLIC
  - Secret: $(secret_key "$ISSUER_ALIAS")
- Test Account 1
  - Alias: $USER1_ALIAS
  - Public: $USER1_PUBLIC
  - Secret: $(secret_key "$USER1_ALIAS")
  - Token Balance: $USER1_BALANCE
- Test Account 2
  - Alias: $USER2_ALIAS
  - Public: $USER2_PUBLIC
  - Secret: $(secret_key "$USER2_ALIAS")
  - Token Balance: $USER2_BALANCE

Verification: minted tokens are present in trustline balances.
REPORT
