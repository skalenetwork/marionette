'''Module for generation of Marionette predeployed smart contract'''

from predeployed_generator.upgradeable_contract_generator import UpgradeableContractGenerator
from marionette_predeployed.marionette_generator import MarionetteGenerator


class UpgradeableMarionetteGenerator(UpgradeableContractGenerator):
    '''Generates upgradeable instance of Marionette contract
    '''

    def __init__(self):
        super().__init__(implementation_generator=MarionetteGenerator())
