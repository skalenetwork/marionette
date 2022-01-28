# marionette-predeployed

## Description

A tool for generating predeployed marionette smart contract

## Installation

```console
pip install marionette-predeployed
```

## Usage example

```python
from marionette_predeployed import  UpgradeableMarionetteGenerator, MARIONETTE_ADDRESS, MARIONETTE_IMPLEMENTATION_ADDRESS

PROXY_ADMIN_ADDRESS = '0xd200000000000000000000000000000000000000'
MAINNET_OWNER_ADDRESS = '0xd200000000000000000000000000000000000001'
SCHAIN_OWNER_ADDRESS = '0xD200000000000000000000000000000000000002'
MESSAGE_PROXY_FOR_SCHAIN_ADDRESS = '0xd200000000000000000000000000000000000003'

marionette_generator = UpgradeableMarionetteGenerator()

genesis = {
    # genesis block parameters
    'alloc': {
        **marionette_generator.generate_allocation(
            contract_address=MARIONETTE_ADDRESS,
            implementation_address=MARIONETTE_IMPLEMENTATION_ADDRESS,            
            proxy_admin_address=PROXY_ADMIN_ADDRESS,
            schain_owner=MAINNET_OWNER_ADDRESS,
            marionette=MARIONETTE_ADDRESS,
            owner=SCHAIN_OWNER_ADDRESS,
            ima=MESSAGE_PROXY_FOR_SCHAIN_ADDRESS,
        )
    }
}

```
