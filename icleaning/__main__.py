"""Entry point for `python -m icleaning` and for PyInstaller.

The import is absolute on purpose: when PyInstaller freezes this file as the
main script, a relative import (`from .main import main`) would fail because
there is no parent package. With the absolute one, the `icleaning` package
resolves the same whether running from the repo or from the packaged binary.
"""
from icleaning.main import main

if __name__ == "__main__":
    main()
