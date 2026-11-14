"""The Lambda package builder: reproducible zips and a clear failure without gold tables.

Dependency installation (pip for Linux arm64) is exercised by the real build, not here.
"""

import os
import zipfile

import pytest

from serverless import build


def make_package(root):
    (root / "ask").mkdir(parents=True)
    (root / "ask" / "guard.py").write_text("x = 1\n")
    (root / "ask" / "__pycache__").mkdir()
    (root / "ask" / "__pycache__" / "guard.cpython-313.pyc").write_bytes(b"junk")
    (root / "main.py").write_text("app = None\n")
    return root


def test_the_zip_is_byte_for_byte_reproducible(tmp_path):
    package = make_package(tmp_path / "package")
    first, second = tmp_path / "a.zip", tmp_path / "b.zip"

    build.write_zip(package, first)
    os.utime(package / "main.py", (2_000_000_000, 2_000_000_000))  # file dates must not matter
    build.write_zip(package, second)

    assert first.read_bytes() == second.read_bytes()


def test_the_zip_holds_sorted_readable_files_without_bytecode(tmp_path):
    package = make_package(tmp_path / "package")
    archive = tmp_path / "api.zip"

    build.write_zip(package, archive)

    with zipfile.ZipFile(archive) as zf:
        assert zf.namelist() == ["ask/guard.py", "main.py"]
        assert all(info.external_attr >> 16 == 0o644 for info in zf.infolist())


def test_copy_app_refuses_to_package_without_gold_tables(tmp_path, monkeypatch):
    monkeypatch.setattr(build, "GOLD", tmp_path / "missing")

    with pytest.raises(SystemExit, match="run the ETL first"):
        build.copy_app(tmp_path / "package")
