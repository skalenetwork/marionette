#!/usr/bin/env python
from marionette_predeployed.marionette_generator import MarionetteGenerator
import json


def main():
    print(json.dumps(MarionetteGenerator().get_abi(), sort_keys=True, indent=4))


if __name__ == '__main__':
    main()
