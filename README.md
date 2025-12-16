# Marionette

<div align="center">

[![License](https://img.shields.io/github/license/skalenetwork/marionette.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/534485763354787851.svg)](https://discord.gg/skale)
[![Build Status](https://github.com/skalenetwork/marionette/actions/workflows/test.yml/badge.svg)](https://github.com/skalenetwork/marionette/actions)
[![codecov](https://codecov.io/gh/skalenetwork/marionette/branch/develop/graph/badge.svg)](https://codecov.io/gh/skalenetwork/marionette)

<p>A smart contract for orchestrating operations in SKALE chains</p>

</div>

## Introduction

Marionette is a predeployed smart contract that acts as an access gateway in SKALE-chains. The only entity with access to Marionette contract is the SKALE chain owner registered in Skale-Manager. If this entity is an EOA account, it can control Marionette directly. If this entity is a MultiSig wallet, it must interact with Marionette through SKALE's IMA bridge.

Marionette is given high level permissions in other predeployed contract in SKALE chains, therefore allowing SKALE-chain owners to control their chain settings.

**NOTE:** To use `Marionette` contract predeployed in your custom EVM chain genesis block use [marionette-predeployed](predeployed/README.md) library. It's available for python and is distributed as a [pip package](https://pypi.org/project/marionette-predeployed).

**Main capabilities**

Marionette provides the following core functionalities:

- **Execute arbitrary function calls**: Chain owners can execute any function call on any contract through the `execute()` method, enabling full control over predeployed contracts and chain settings.

- **IMA bridge integration**: Supports receiving messages from the IMA bridge via `postMessage()`, allowing MultiSig wallet owners on mainnet to control their SKALE chain remotely from Mainnet.

- **sFuel transfers**: Chain owners can send sFuel (SKALE's gas token) to any address using `sendSFuel()`, useful for funding accounts or contracts.

- **Access control**: Implements role-based access control with three key roles:
  - `PUPPETEER_ROLE`: Assigned to the chain owner wallet on mainnet, grants permission to execute all main functions
  - `IMA_ROLE`: Assigned to the IMA bridge contract for cross-chain message handling
  - `DEFAULT_ADMIN_ROLE`: Held by the contract itself for administrative functions - PUPPETEER can call the contract itself

## Installation & Setup

### Prerequisites

Before working with this repository, ensure you have the following installed:

- **Node.js**: Version 18.x, 20.x, or 22.x
- **Yarn**: Package manager (for Node.js dependencies)
- **Python**: Version 3.8 or higher
- **pip**: Python package manager

Optional tools for development:
- **Geth**: Ethereum client v1.13.X (required for some predeployed package tests)
- **Slither**: Solidity static analyzer (installed via pip)

### Clone and Install

1. Clone the repository:
```bash
git clone https://github.com/skalenetwork/marionette.git
cd marionette
```

2. Install Node.js dependencies:
```bash
yarn install
```

3. Install Python dependencies for Slither (static analysis):
```bash
pip3 install -r scripts/requirements.txt
```

4. Install Python dependencies for predeployed package development (optional):
```bash
pip3 install -r predeployed/scripts/requirements.txt
pip3 install -r predeployed/test/requirements.txt
```

5. Compile the contracts:
```bash
yarn compile
```

6. Install geth (method used in CI)
```bash
wget https://gethstore.blob.core.windows.net/builds/geth-linux-amd64-1.13.15-c5ba367e.tar.gz
tar -xvf geth-linux-amd64-1.13.15-c5ba367e.tar.gz
sudo mv geth-linux-amd64-1.13.15-c5ba367e/geth /usr/local/bin/geth
```

7. Verify geth

```bash
geth version # should output content with Version: 1.13.15-stable
which geth # should output /usr/local/bin/geth
```

## Running Tests

### Solidity Contract Tests

Run the main test suite for Marionette smart contracts:
```bash
yarn test
```

Run tests with coverage report:
```bash
npx hardhat coverage
```

### Linting and Static Analysis

Run all quality checks (linting, spell check, static analysis, type checking):
```bash
yarn fullCheck
```

Individual checks:
```bash
yarn lint        # Solidity linting with solhint
yarn cspell      # Spell checking
yarn slither     # Static analysis with Slither
yarn tsc         # TypeScript type checking
yarn eslint      # JavaScript/TypeScript linting
```

### Deployment Tests

Test the deployment script:
```bash
./scripts/test_deploy.sh
```

### Python Predeployed Package Tests

Set up Python environment and run predeployed package tests:

1. Ensure Python dependencies are installed:
```bash
pip3 install -r predeployed/scripts/requirements.txt
pip3 install -r predeployed/test/requirements.txt
```

2. Run type checking:
```bash
mypy predeployed/src
```

3. Run Python linting:
```bash
pylint predeployed/src/marionette_predeployed/
```

4. Run pytest (with coverage):
```bash
PYTHONPATH=predeployed/src pytest --cov=marionette_predeployed
# --cov is optional
```

5. (Optional) Build the package to verify it builds correctly:
```bash
VERSION="0.0.0" predeployed/scripts/build_package.sh
```

## Deployments

Marionette has a predefined address in all SKALE chains: **0xD2c0DeFACe000000000000000000000000000000**

Examples:
 * EUROPA: https://elated-tan-skat.explorer.mainnet.skalenodes.com/address/0xD2c0DeFACe000000000000000000000000000000


## Resources

- **SKALE Developer Documentation** – https://docs.skale.space/
- **IMA Repository** – https://github.com/skalenetwork/ima
- **SKALE Whitepaper** – Whitepaper of SKALE Network: https://skale.space/whitepaper
- **SKALE Main Website** – High-level overview of the network, architecture, and ecosystem: https://www.skale.space/
- **SKALE Ecosystem Portal** – Explorer, bridges, staking dashboard, live chains & projects: https://portal.skale.space/


## License

[![License](https://img.shields.io/github/license/skalenetwork/marionette.svg)](LICENSE)

All contributions are made under the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html). See [LICENSE](LICENSE).

Copyright (C) 2021-Present SKALE Labs
