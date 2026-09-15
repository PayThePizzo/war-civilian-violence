# Installation

This project expects a reproducible Python setup and a local Node toolchain for the frontend. The recommended path is:

- Python 3.12 via `pyenv`
- Poetry for dependency management
- Node.js 20.19+ or 22.12+ for the Vite frontend

## Requirements

- Python 3.12
- [pyenv](https://github.com/pyenv/pyenv)
- [Poetry](https://python-poetry.org/)
- Node.js 20.19+ or 22.12+
- Git

> The project is explicitly designed for Python 3.12. The system Python 3.10 is not the target environment.

---

## Clone the repository

```bash
git clone <repo-url>
cd war-civilian-violence
```

---

## Create the Python environment

The repository uses a project-local Python environment managed with `pyenv` and Poetry.

```bash
# install Python 3.12 if it is not already available
pyenv install 3.12.7

# create a project environment named "test"
pyenv virtualenv 3.12.7 test

# activate it for the current shell
pyenv activate test
```

If you prefer to use the Poetry-managed environment directly, you can also let Poetry create the virtualenv inside the project directory.

---

## Install Poetry and project dependencies

```bash
pip install poetry==1.8.5
poetry install
```

Because `poetry.toml` sets `in-project = true`, the virtualenv is created under `.venv/` inside the repository. If you want to run commands manually without Poetry, activate it with:

```bash
source .venv/bin/activate
```

---

## Verify the environment

Check that the expected tools are available:

```bash
python --version
poetry --version
```

You should see Python 3.12.x and the Poetry version you installed.

---

## Frontend prerequisites

The browser app is built with Vite + TypeScript, D3, MapLibre GL JS, and deck.gl. Install the frontend toolchain from the `web/` folder:

```bash
cd web
npm install
```

Check the required Node version before running the dev server:

```bash
node --version
npm --version
```

---

## Typical project commands

From the repository root:

```bash
# run the full pipeline
poetry run python scripts/build_all.py

# or run a single stage
poetry run python scripts/01_clean_events.py

# serve the docs locally
poetry run mkdocs serve
```

From the frontend directory:

```bash
cd web
npm run dev
```

---

## Dependency overview

| Package / tool | Purpose |
|---|---|
| Python 3.12 | Analysis and preprocessing pipeline |
| Poetry | Reproducible Python dependency management |
| pandas / geopandas / pyarrow / numpy | Data cleaning, aggregation, and Parquet output |
| pyyaml | Configuration loading |
| mkdocs | Project documentation site |
| Node.js + npm | Frontend development and Vite build |
| D3.js | Timeline, actor, and event-window visualizations |
| MapLibre GL JS + deck.gl | H3 map visualization |

If you are setting up from scratch, the fastest path is:

```bash
pyenv install 3.12.7
pyenv virtualenv 3.12.7 test
pyenv activate test
pip install poetry==1.8.5
poetry install
cd web
npm install
```
