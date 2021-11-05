import json
import subprocess
import os


class GethInstance:    
    def __init__(self, geth):
        self.geth = geth
    def __enter__(self):
        return self.geth.pid
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.geth:
            self.geth.terminate()
            self.geth.communicate()
            assert self.geth.returncode == 0



class TestPredeployed:
    GENESIS_FILENAME = 'genesis.json'

    def generate_genesis(self, allocations: dict = {}):
        base_genesis_filename = os.path.join(os.path.dirname(__file__), 'base_genesis.json')
        with open(base_genesis_filename) as base_genesis_file:
            genesis = json.load(base_genesis_file)
            genesis['alloc'].update(allocations)
            return genesis

    def run_geth(self, tmpdir, genesis):
        genesis_filename = os.path.join(tmpdir, TestPredeployed.GENESIS_FILENAME)
        with open(genesis_filename, 'w') as f:
            json.dump(genesis, f)

        # prepare geth
        process = subprocess.run(['geth', '--datadir', tmpdir, 'init', genesis_filename], capture_output=True)
        assert process.returncode == 0

        # run geth
        self.geth = subprocess.Popen(['geth', '--datadir', tmpdir, '--dev', '--http'], stderr=subprocess.PIPE, universal_newlines=True)

        while True:
            assert self.geth.poll() is None
            output_line = self.geth.stderr.readline()
            if 'HTTP server started' in output_line:
                break

        return GethInstance(self.geth)

    def stop_geth(self):
        if self.geth:
            self.geth.terminate()
            self.geth.communicate()
            assert self.geth.returncode == 0
