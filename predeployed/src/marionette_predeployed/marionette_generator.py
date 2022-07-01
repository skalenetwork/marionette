'''Module for generaration of predeployed Marionette smart contract'''

from os.path import dirname, join
from typing import Dict
from web3.auto import w3

from predeployed_generator.openzeppelin.access_control_enumerable_generator \
    import AccessControlEnumerableGenerator


class MarionetteGenerator(AccessControlEnumerableGenerator):
    '''Generates non upgradeable instance of Marionette
    '''

    ARTIFACT_FILENAME = 'Marionette.json'
    META_FILENAME = 'Marionette.meta.json'
    DEFAULT_ADMIN_ROLE = (0).to_bytes(32, 'big')
    IMA_ROLE = w3.solidityKeccak(['string'], ['IMA_ROLE'])
    PUPPETEER_ROLE = w3.solidityKeccak(['string'], ['PUPPETEER_ROLE'])

    # --------------- storage ---------------
    # ------------ Initializable ------------
    # 0:    _initialized, _initializing
    # --------- ContextUpgradeable ----------
    # 1:    __gap
    # ...   __gap
    # 50:   __gap
    # ---------- ERC165Upgradeable ----------
    # 51:   __gap
    # ...   __gap
    # 100:  __gap
    # ------- AccessControlUpgradeable -------
    # 101:  _roles
    # 102:  __gap
    # ...   __gap
    # 150:  __gap
    # -- AccessControlEnumerableUpgradeable --
    # 151:  _roleMembers
    # 152:  __gap
    # ...   __gap
    # 200:  __gap
    # --------- Marionette ---------


    INITIALIZED_SLOT = 0
    ROLES_SLOT = 101
    ROLE_MEMBERS_SLOT = 151

    def __init__(self):
        generator = MarionetteGenerator.from_hardhat_artifact(
            join(dirname(__file__), 'artifacts', self.ARTIFACT_FILENAME),
            join(dirname(__file__), 'artifacts', self.META_FILENAME))
        super().__init__(bytecode=generator.bytecode, abi=generator.abi, meta=generator.meta)

    @classmethod
    def generate_storage(cls, **kwargs) -> Dict[str, str]:
        '''Generate smart contract storage.

        Arguments:
            - marionette
            - owner
            - ima
            - schain_owner

        Returns an object in format:
        {
            "0x00": "0x5",
            "0x01": "0x13"
        }
        '''

        owner = kwargs['owner']
        schain_owner = kwargs['schain_owner']
        ima = kwargs['ima']
        marionette = kwargs['marionette']
        roles_slots = cls.RolesSlots(roles=cls.ROLES_SLOT, role_members=cls.ROLE_MEMBERS_SLOT)

        storage: Dict[str, str] = {}
        cls._write_uint256(storage, cls.INITIALIZED_SLOT, 1)
        cls._setup_role(storage, roles_slots, cls.DEFAULT_ADMIN_ROLE, [marionette])
        cls._setup_role(storage, roles_slots, cls.IMA_ROLE, [ima])
        cls._setup_role(storage, roles_slots, cls.PUPPETEER_ROLE, [owner, schain_owner])

        return storage
