# IOTA Access Policy Store
## Overview
Policy store consists of interface servers for managing delegation policies on IOTA tangle.
It is able to manage REST and TCP requests and it communicates with IOTA node for storing policies and local SQL database where their tangle addresses are stored.

## 1.0 Prerequisites
Make sure you have the following software installed on your system:
* npm (Node Package Manager)
```bash
sudo apt-get install npm
```
* Docker
```bash
sudo apt-get install docker
```
* Docker-compose
```bash
sudo apt-get install docker-compose
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
The configurations are set on `config/default.json`:
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
    "node": {
        "host": string,
        "port": number
    }
}
```
* `server.rest.listeningPort` - Listening port for REST server.
* `server.tcp.listeningPort` - Listening port for TCP server.
* `db.host` - Host address for database.
* `db.port` - Port number for database.
* `node.host` - IP address for IOTA node.
* `node.port` - Port number for IOTA node.

**Warning ⚠️**
As a known limitation, you will need a [HORNET](https://github.com/gohornet/hornet) node with the following available features:
- `"attachToTangle"` enabled under `"permitRemoteAccess"` field of configuration file.
- HTTP port available (usually 14265).

Nodes behind load balancers or firewalls might present unexpected behaviour.

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
Install `Docker` on your system in order to run store. It is also required to have running and accessible IOTA node.

To start store run:
```bash
./start_store.sh
```

## 4. Stop
To stop store run:
```bash
./stop_store.sh
```
