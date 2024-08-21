import json
import subprocess
import os
import random
import string


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

    def generate_extradata(self):
        self.password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
        self.password_filename = os.path.join(self.datadir, 'password.txt')
        with open(self.password_filename, 'w') as password_f:
            password_f.writelines([self.password])
        process = subprocess.run(['geth', 'account', 'new', '--datadir', self.datadir, '--password', self.password_filename])
        assert process.returncode == 0

        process = subprocess.Popen(['geth', 'account', 'list', '--datadir', self.datadir], stdout=subprocess.PIPE,
                                   universal_newlines=True)
        account0 = process.stdout.readline()
        self.author_address = account0.split()[2][1:-1]
        return '0x' + '00' * 32 + self.author_address + '00' * 65

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
        self.geth = subprocess.Popen(
            [
                'geth',
                '--datadir', tmpdir,
                '--dev',
                '--http'
            ],
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        output = []
        while True:
            return_code = self.geth.poll()
            if return_code is None:
                output_line = self.geth.stderr.readline()
                output.append(output_line)
                if 'HTTP server started' in output_line:
                    break
            else:
                # geth stopped
                for line in output:
                    print(line)
                for line in self.geth.stderr.readlines():
                    print(line)
                raise RuntimeError("Geth was not started")

        return GethInstance(self.geth)

    def stop_geth(self):
        if self.geth:
            self.geth.terminate()
            self.geth.communicate()
            assert self.geth.returncode == 0
