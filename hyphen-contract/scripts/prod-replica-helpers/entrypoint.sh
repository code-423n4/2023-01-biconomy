#!/bin/bash
SCRIPT_PATH=$(dirname "$0")

setup () {
    npx hardhat run $SCRIPT_PATH/transfer-ownership.ts --network $1
    npx hardhat run $SCRIPT_PATH/upgrade-force-import.ts --network $1
    PRIVATE_KEY=$NEW_OWNER_PRIVATE_KEY npx hardhat run $SCRIPT_PATH/../upgrades/upgrade-all/prod.ts --network $1
    npx hardhat run $SCRIPT_PATH/fund-account.ts --network $1
}

setup mainnet &
setup polygon &
wait