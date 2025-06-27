#!/usr/bin/env python3
"""Test runner script for PoD Protocol Python SDK."""

import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd, check=True):
    """Run a command and return the result."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=check, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="Run PoD Protocol Python SDK tests")
    parser.add_argument(
        "--type",
        choices=["unit", "integration", "e2e", "all"],
        default="all",
        help="Type of tests to run"
    )
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Run tests with coverage"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Run tests in verbose mode"
    )
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Skip slow tests"
    )
    
    args = parser.parse_args()
    
    # Base pytest command
    cmd = ["python", "-m", "pytest"]
    
    # Add test type markers
    if args.type == "unit":
        cmd.extend(["-m", "unit"])
    elif args.type == "integration":
        cmd.extend(["-m", "integration"])
    elif args.type == "e2e":
        cmd.extend(["-m", "e2e"])
    elif args.type == "all":
        pass  # Run all tests
    
    # Add options
    if args.coverage:
        cmd.extend(["--cov=pod_protocol", "--cov-report=html", "--cov-report=term-missing"])
    
    if args.verbose:
        cmd.append("-v")
    
    if args.parallel:
        cmd.extend(["-n", "auto"])
    
    if args.fast:
        cmd.extend(["-m", "not slow"])
    
    # Run the tests
    try:
        result = run_command(cmd)
        print(f"\n✅ Tests completed successfully!")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Tests failed with return code {e.returncode}")
        return e.returncode


if __name__ == "__main__":
    sys.exit(main())
