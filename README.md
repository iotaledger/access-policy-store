# IOTA Access Policy Store
## Overview
Policy store consists of interface servers for managing delegation policies on IOTA tangle.
It is able to manage REST and TCP requests and it communicates with IOTA node for storing policies and local SQL database where their tangle addresses are stored.

## 1.0 Prerequisites
You should have installed npm (Node Package Manager) on your system. If you don't have install it by running
```bash
sudo apt-get install npm
```
## 1.1 Building
First install all dependencies by running next command inside projects root directory
```bash
npm install
```
Store is written in `TypeScript`. To run it, it must be compiled to `JavaScript` using `TypeScript` compiler. Build the project by running `build` script.
```bash
npm run build
```

## 2. Configuring
Create `.env` file in root directory. It should contain next values:
```bash
SEED=
POSTGRES_PASSWORD=
POSTGRES_USER=
POSTGRES_DB=
```

* `SEED` - Seed for account to make transactions on IOTA tangle.
* `POSTGRES_PASSWORD` - Password for postgres.
* `POSTGRES_USER` - User for postgres.
* `POSTGRES_DB` - Database to connect to in postgres.

Published port numbers must match corresponding port numbers in `config/default.json`.

## 3. Start
Install `Docker` on your system in order to run store. It is also required to have running and accessible IRI node.

To start store run:
```bash
./start_store.sh
```

## 4. Stop
To stop store run:
```bash
./stop_store.sh
```
