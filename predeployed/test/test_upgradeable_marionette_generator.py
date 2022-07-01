from web3.auto import w3
from predeployed_generator.openzeppelin.proxy_admin_generator import ProxyAdminGenerator

from marionette_predeployed import UpgradeableMarionetteGenerator, MARIONETTE_ADDRESS
from marionette_predeployed.marionette_generator import MarionetteGenerator
from .tools.test_solidity_project import TestSolidityProject


class TestUpgradeableMarionetteGenerator(TestSolidityProject):
    SCHAIN_OWNER_ADDRESS = '0xd200000000000000000000000000000000000000'
    PROXY_ADMIN_ADDRESS = '0xd200000000000000000000000000000000000001'
    OWNER_ADDRESS = '0xD200000000000000000000000000000000000002'
    IMA_ADDRESS = '0xd200000000000000000000000000000000000003'

    def get_marionette_abi(self):
        return self.get_abi('Marionette')

    def prepare_genesis(self):
        proxy_admin_generator = ProxyAdminGenerator()
        upgradeable_marionette_generator = UpgradeableMarionetteGenerator()

        return self.generate_genesis({
            **upgradeable_marionette_generator.generate_allocation(
                MARIONETTE_ADDRESS,
                proxy_admin_address=self.PROXY_ADMIN_ADDRESS,
                owner=self.OWNER_ADDRESS,
                schain_owner=self.SCHAIN_OWNER_ADDRESS,
                ima=self.IMA_ADDRESS,
                marionette=MARIONETTE_ADDRESS),
            **proxy_admin_generator.generate_allocation(
                self.PROXY_ADMIN_ADDRESS,
                owner_address=self.OWNER_ADDRESS)
            })

    def test_default_admin_role(self, tmpdir):
        self.datadir = tmpdir
        genesis = self.prepare_genesis()

        with self.run_geth(tmpdir, genesis):
            assert w3.isConnected()

            marionette = w3.eth.contract(address=MARIONETTE_ADDRESS, abi=self.get_marionette_abi())
            assert marionette.functions.getRoleMemberCount(MarionetteGenerator.DEFAULT_ADMIN_ROLE).call() == 1
            assert marionette.functions.getRoleMember(MarionetteGenerator.DEFAULT_ADMIN_ROLE, 0).call() == MARIONETTE_ADDRESS
            assert marionette.functions.hasRole(MarionetteGenerator.DEFAULT_ADMIN_ROLE, MARIONETTE_ADDRESS).call()

    def test_ima_role(self, tmpdir):
        self.datadir = tmpdir
        genesis = self.prepare_genesis()

        with self.run_geth(tmpdir, genesis):
            assert w3.isConnected()

            marionette = w3.eth.contract(address=MARIONETTE_ADDRESS, abi=self.get_marionette_abi())
            assert marionette.functions.getRoleMemberCount(MarionetteGenerator.IMA_ROLE).call() == 1
            assert marionette.functions.getRoleMember(MarionetteGenerator.IMA_ROLE, 0).call() == self.IMA_ADDRESS
            assert marionette.functions.hasRole(MarionetteGenerator.IMA_ROLE, self.IMA_ADDRESS).call()

    def test_PUPPETEER_ROLE(self, tmpdir):
        self.datadir = tmpdir
        genesis = self.prepare_genesis()

        with self.run_geth(tmpdir, genesis):
            assert w3.isConnected()

            marionette = w3.eth.contract(address=MARIONETTE_ADDRESS, abi=self.get_marionette_abi())

            assert marionette.functions.getRoleMemberCount(MarionetteGenerator.PUPPETEER_ROLE).call() == 2
            assert marionette.functions.getRoleMember(MarionetteGenerator.PUPPETEER_ROLE, 0).call() == self.OWNER_ADDRESS
            assert marionette.functions.hasRole(MarionetteGenerator.PUPPETEER_ROLE, self.OWNER_ADDRESS).call()
            assert marionette.functions.getRoleMember(MarionetteGenerator.PUPPETEER_ROLE, 1).call() == self.SCHAIN_OWNER_ADDRESS
            assert marionette.functions.hasRole(MarionetteGenerator.PUPPETEER_ROLE, self.SCHAIN_OWNER_ADDRESS).call()

    def test_meta_info(self):
        meta = MarionetteGenerator().get_meta()
        assert meta['name'] == 'Marionette'