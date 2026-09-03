# Installation

TODO

## Requirements

- **Python 3.12** (managed via [pyenv](https://github.com/pyenv/pyenv) — the system Python 3.10 will not work)

---

FIXME: We use an environment that was created with pyenv, then install poetry to it and install the dependencies.
So we can just show the standard method with just creating env + install poetry to env + install dependencies.
We do not wanna show how to install everything too much in detail.

## Install with Poetry (recommended)

[Poetry](https://python-poetry.org/) pins exact versions for reproducible builds.

```bash
# 1. Install Poetry if you don't have it
pip install poetry==1.8.5

# 2. Clone the repository
git clone # TODO
cd # TODO

# 3. Install all dependencies into a local virtual environment
poetry install
```

FIXME: 
The virtual environment is created inside the project directory (`.venv/`) because `poetry.toml` sets `in-project = true`.

Activate it when running commands manually:

```bash
source .venv/bin/activate
```

---

## Install with pip

```bash
pip install -r requirements.txt
```

---

## Verify the installation

```bash
# TODO
```

---

## Dependencies overview

TODO

| Package | Version | Purpose |
|---|---|---|
