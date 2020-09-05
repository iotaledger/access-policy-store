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
Configuring is done via `config`, `.env` and `Dockerfile` files.

### 2.1. Config files
There are two config files, `default.json` used for development, and `production.json` used when running store in production environment. They both have the same structure:
```JSON
{
    "server": {
        "rest": {
            "listeningPort": number
        },
        "tcp": {
            "listeningPort": number
        }
    },
    "db": {
        "host": string,
        "port": number
    },
    "iri": {
        "host": string,
        "port": number
    }
}
```
* `server.rest.listeningPort` - Listening port for REST server.
* `server.tcp.listeningPort` - Listening port for TCP server.
* `db.host` - Host address for database.
* `db.port` - Port number for database.
* `iri.host` - IP address for IOTA node.
* `iri.port` - Port number for IOTA node.

### 2.2. ENV file
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

### 2.3. Dockerfile
Published port numbers must match corresponding port numbers in `config` files.

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

## 5. Testing/Developing

For testing and development create private tangle using `one-command-tangle` project which can be found [here](https://github.com/iota-community/one-command-tangle).
