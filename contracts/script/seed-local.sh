#!/usr/bin/env bash
# Deploys TrueUp to a local Anvil node and leaves markets in every lifecycle state, so the web app
# can be run against the real contract. Local development only: the keys below are Anvil's public
# test keys and hold nothing of value.
#
#   anvil &                         # in another terminal
#   bash contracts/script/seed-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

RPC=${RPC:-http://127.0.0.1:8545}
[ "$(cast chain-id --rpc-url "$RPC")" = "31337" ] || { echo "not an Anvil node (chain 31337)"; exit 1; }

K=(
  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
  0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
  0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
  0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
  0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
  0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
  0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
)
addr() { cast wallet address "$1"; }
send() { local key=$1; shift; cast send --rpc-url "$RPC" --private-key "$key" "$@" >/dev/null; }
now() { cast block latest --rpc-url "$RPC" --field timestamp; }

OWNER=$(addr "${K[0]}")
OUT=$(PRIVATE_KEY=${K[0]} OWNER=$OWNER forge script script/Deploy.s.sol --rpc-url "$RPC" --private-key "${K[0]}" --broadcast 2>&1)
T=$(echo "$OUT" | grep "TrueUp deployed at" | awk '{print $NF}')
BLOCK=$(echo "$OUT" | grep "deploy block" | awk '{print $NF}')
echo "TrueUp at $T (block $BLOCK)"

create() { # key question a b stake deadline
  send "$1" "$T" "createMarket(string,string,string,uint256,uint64)" "$2" "$3" "$4" "$5" "$6"
}
join() { send "$1" "$T" "join(uint256,uint8)" "$2" "$3" --value "$4"; }

CREATOR=${K[1]}
S=$(now)

# 1: long-running open market, 4 vs 3
create "$CREATOR" "Will Maya finish the 5K on Saturday?" "She finishes" "She does not finish" 0.2ether $((S + 29*86400))
for i in 2 3 4 5; do join "${K[$i]}" 1 1 0.2ether; done
for i in 6 7; do join "${K[$i]}" 1 2 0.2ether; done
join "${K[0]}" 1 2 0.2ether

# 2: will be settled, A wins (3 vs 2)
create "$CREATOR" "Will Tomi's team win the five-a-side final?" "Tomi's team wins" "They lose" 0.1ether $((S + 3700))
for i in 2 3 4; do join "${K[$i]}" 2 1 0.1ether; done
for i in 5 6; do join "${K[$i]}" 2 2 0.1ether; done

# 3: one-sided, nobody on B
create "$CREATOR" "Will Kemi's sourdough rise overnight?" "It rises" "It stays flat" 0.05ether $((S + 3700))
for i in 2 3; do join "${K[$i]}" 3 1 0.05ether; done

# 4: creator never settles, refunds after 72 h
create "$CREATOR" "Will the hackathon demo run without crashing?" "Runs clean" "It crashes" 0.1ether $((S + 3700))
for i in 2 3; do join "${K[$i]}" 4 1 0.1ether; done
for i in 4 5; do join "${K[$i]}" 4 2 0.1ether; done

cast rpc --rpc-url "$RPC" evm_increaseTime 7200 >/dev/null && cast rpc --rpc-url "$RPC" evm_mine >/dev/null
send "$CREATOR" "$T" "settle(uint256,uint8)" 2 1
send "${K[2]}" "$T" "claimWinnings(uint256)" 2
send "${K[2]}" "$T" "claimRefund(uint256)" 3

cast rpc --rpc-url "$RPC" evm_increaseTime $((72*3600)) >/dev/null && cast rpc --rpc-url "$RPC" evm_mine >/dev/null
send "${K[7]}" "$T" "openRefunds(uint256)" 4
send "${K[2]}" "$T" "claimRefund(uint256)" 4

echo
echo "Seeded 4 markets. Put these in web/.env.local and restart the dev server:"
echo "  NEXT_PUBLIC_NETWORK=local"
echo "  NEXT_PUBLIC_LOCAL_CONTRACT=$T"
echo "  NEXT_PUBLIC_DEPLOY_BLOCK=$BLOCK"
echo "  NEXT_PUBLIC_DATA_SOURCE="
echo "Participant with every kind of position: $(addr "${K[2]}")"
