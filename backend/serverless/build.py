"""Build the Lambda deployment package: the API, its dependencies for Linux arm64, the gold tables.

    python -m serverless.build              # from backend/, after the ETL wrote data/gold

pip downloads wheels for the Lambda runtime (CPython 3.13, manylinux aarch64) whatever the host
is, so the same command works on Windows, macOS, Linux and CI. Output in build/lambda/:
package/ (what Lambda unpacks, also mounted by the local runtime container) and api.zip
(byte-for-byte reproducible: sorted entries, fixed timestamps and permissions).
"""

import argparse
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
APP_MODULES = (
    "main.py",
    "config.py",
    "repository.py",
    "services.py",
    "cloud_secrets.py",
    "lambda_handler.py",
)
APP_PACKAGES = ("ask",)
GOLD = Path("data") / "gold"
# The python3.13 runtime runs on Amazon Linux 2023 (glibc 2.34): any manylinux wheel up to 2_34 fits
MANYLINUX = ("manylinux_2_34_aarch64", "manylinux_2_28_aarch64", "manylinux2014_aarch64")
PLATFORM = (*(arg for tag in MANYLINUX for arg in ("--platform", tag)), "--python-version", "3.13")
# Lambda limits: 50 MB for a zip uploaded directly, 250 MB unpacked
MAX_ZIP_BYTES = 50 * 1024 * 1024
MAX_UNZIPPED_BYTES = 250 * 1024 * 1024
ZIP_DATE = (1980, 1, 1, 0, 0, 0)
JUNK = ("__pycache__", ".pyc", ".pyi")


def install_dependencies(target: Path) -> None:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--quiet",
            "--disable-pip-version-check",
            "--no-compile",
            "--only-binary=:all:",
            "--implementation",
            "cp",
            *PLATFORM,
            "--target",
            str(target),
            "--requirement",
            str(BACKEND / "requirements-lambda.txt"),
        ],
        check=True,
    )
    shutil.rmtree(target / "bin", ignore_errors=True)  # console scripts are not used on Lambda


def copy_app(package: Path) -> None:
    gold = BACKEND / GOLD
    if not any(gold.glob("*/*.parquet")):
        raise SystemExit(f"No gold tables under {gold}: run the ETL first.")
    for module in APP_MODULES:
        shutil.copy2(BACKEND / module, package / module)
    for name in APP_PACKAGES:
        shutil.copytree(BACKEND / name, package / name, ignore=shutil.ignore_patterns(*JUNK))
    shutil.copytree(gold, package / GOLD, ignore=shutil.ignore_patterns("_*", ".*", "*.crc"))


def package_files(package: Path) -> list[Path]:
    return sorted(
        path
        for path in package.rglob("*")
        if path.is_file() and not any(part.endswith(JUNK) for part in path.parts)
    )


def write_zip(package: Path, archive: Path) -> None:
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in package_files(package):
            info = zipfile.ZipInfo(path.relative_to(package).as_posix(), ZIP_DATE)
            info.external_attr = 0o644 << 16  # readable by the Lambda runtime user
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, path.read_bytes())


def build(out: Path) -> Path:
    package = out / "package"
    archive = out / "api.zip"
    shutil.rmtree(out, ignore_errors=True)
    package.mkdir(parents=True)
    copy_app(package)  # first: fails fast when the ETL has not run
    install_dependencies(package)
    write_zip(package, archive)

    unzipped = sum(path.stat().st_size for path in package_files(package))
    zipped = archive.stat().st_size
    print(f"{archive}: {zipped / 1e6:.1f} MB zipped, {unzipped / 1e6:.1f} MB unpacked")
    if zipped > MAX_ZIP_BYTES or unzipped > MAX_UNZIPPED_BYTES:
        raise SystemExit("The package is over the Lambda size limits.")
    return archive


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=BACKEND / "build" / "lambda")
    build(parser.parse_args().out)


if __name__ == "__main__":
    main()
