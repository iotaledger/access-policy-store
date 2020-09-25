/*
 * This file is part of the Frost distribution
 * (https://github.com/iotaledger/frost)
 * 
 * Copyright (c) 2020 IOTA.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as utils from '../utils/utils';
import logger from '../utils/logger';
import { Controller, Body, CommunicationType } from './controller';
import { Database, Policy } from '../db/database';
import { PgDatabase } from '../db/pg_database';
import _ from 'lodash';
import * as Iota from '@iota/core';
import * as Converter from '@iota/converter';
import { sha256 } from "js-sha256";
import { StringRes } from '../assets/string_res';

/**
 * Maximum number of trytes single chunk (transaction) can have
 */
const MAX_TRYTES_IN_CHUNK = 2187;

export * from './controller';

export class IotaController implements Controller {

    public type: CommunicationType;
    private seed: string;
    private db: Database;
    private iota: Iota.API;

    constructor(seed: string, nodeAddr: string, type: CommunicationType) {
        this.type = type;
        this.seed = seed;
        this.iota = Iota.composeAPI({ provider: nodeAddr });
        this.db = new PgDatabase();

        if (_.isUndefined(this.iota) || _.isNull(this.iota)) {
            throw StringRes.UNABLE_TO_CONNECT_TO_IOTA_NODE;
        }
    }

    async addPolicy(body: Body): Promise<any> {
        const policy = body.policy;
        const owner = body.owner;
        const deviceId = body.deviceId;
        const signature = body.signature;

        // Check if mandatory fields are present.
        // If they are not, return rejected promise with message.
        if (_.isUndefined(policy))
            return Promise.reject(StringRes.MISSING_POLICY_ID_INSIDE_POLICY);
        if (_.isUndefined(owner))
            return Promise.reject(StringRes.MISSING_OWNER);
        if (_.isUndefined(deviceId))
            return Promise.reject(StringRes.MISSING_DEVICE_ID);
        if (_.isUndefined(signature))
            return Promise.reject(StringRes.MISSING_SIGNATURE);

        try {
            const policyId = policy.policy_id;
            if (_.isEmpty(policyId))
                return Promise.reject(StringRes.MISSING_POLICY_ID_INSIDE_POLICY);

            // check if policy with policyID already exists
            try {
                await this.db.getPolicyByPolicyId(policyId);
                const message = StringRes.POLICY_ADDED_SUCCESSFULLY;

                let response: any;

                if (this.type == CommunicationType.tcp)
                    response = { response: message };
                else
                    response = utils.defaultResponse(false, message);

                return Promise.resolve(response);
            } catch (err) {
                // policy could not be found so everything is OK
            }

            logger.debug('addPolicy: Getting new address on tangle');

            const addr = await this.getNewAddress(this.seed);

            logger.debug(`addPolicy: New address on tangle: ${addr}`);

            const policyJson = JSON.stringify({
                policyId: policyId,
                deviceId: deviceId,
                owner: owner,
                policy: policy,
                signature: signature
            });

            const msgTrytes = Converter.asciiToTrytes(policyJson);

            const transactions = this.makeChunks(msgTrytes)
                .map((chunk: string) => {
                    return {
                        value: 0,
                        address: addr,
                        message: chunk,
                        tag: ''
                    }
                });

            logger.debug('addPolicy: Preparing transfer of transactions');

            const trytes =
                await this.iota.prepareTransfers(this.seed, transactions);

            logger.debug('addPolicy: Sending trytes to tangle');

            const depth = 3;
            const minimumWeightMagnitude = 9;

            const bundle = await this.iota
                .sendTrytes(trytes, depth, minimumWeightMagnitude);

            const hash = bundle[0].hash;

            const newPolicy: Policy = {
                deviceId: deviceId,
                hash: hash,
                owner: owner,
                policyId: policyId
            };

            logger.debug('addPolicy: Adding policy to database');

            await this.db.addNewPolicy(newPolicy);

            logger.debug('addPolicy: Policy added to database');

            const message = StringRes.POLICY_ADDED_SUCCESSFULLY;

            let response: any;

            if (this.type == CommunicationType.tcp)
                response = { response: message };
            else
                response = utils.defaultResponse(false, message);

            return Promise.resolve(response);
        } catch (err) {
            logger.error('Error while adding policy: ', err);
            const message = StringRes.UNABLE_TO_ADD_POLICY;
            let response: any;

            if (this.type == CommunicationType.tcp)
                response = { response: message };
            else
                response = utils.defaultResponse(false, message);

            return Promise.resolve(response);
        }
    }

    async clearPolicyList(body: Body): Promise<any> {
        const deviceId = body.deviceId;
        if (_.isUndefined(deviceId))
            return Promise.reject(StringRes.MISSING_DEVICE_ID);

        try {
            const policyList = await this.db.getPolicyListByDeviceId(deviceId);
            if (_.isEmpty(policyList)) {
                const message = StringRes.POLICY_STORE_EMPTY;
                let response: any;

                if (this.type == CommunicationType.tcp)
                    response = { response: message }
                else
                    response = utils.defaultResponse(true,
                        StringRes.POLICY_STORE_EMPTY);

                return Promise.resolve(response);
            } else {
                await this.db.deletePoliciesForDeviceWithId(deviceId);
                const message = StringRes.DELETING_ALL_POLICIES;
                let response: any;

                if (this.type == CommunicationType.tcp)
                    response = { response: message };
                else
                    response = utils.defaultResponse(false, message);

                return Promise.resolve(response);
            }
        } catch (err) {
            logger.error('Error while deleting policies: ', err);
            const message = StringRes.UNABLE_TO_DELETE_POLICIES;
            let response: any;

            if (this.type == CommunicationType.tcp)
                response = { response: message };
            else
                response = utils.defaultResponse(true, message);

            return Promise.resolve(response);
        }
    }

    async getPolicy(body: Body): Promise<any> {
        const policyId = body.policyId;

        if (_.isUndefined(policyId))
            return Promise.reject(StringRes.MISSING_POLICY_ID);

        try {
            const policy: Policy = await this.db.getPolicyByPolicyId(policyId);
            if (_.isEmpty(policy) || policy.hash == undefined) {
                const message = StringRes.POLICY_NOT_FOUND;
                let response: any;

                if (this.type == CommunicationType.tcp)
                    response = { response: message };
                else
                    response = utils.defaultResponse(true, message);

                return Promise.resolve(response);
            } else {
                let policyFromBundle =
                    await this.getMessageFromBundle(policy.hash)
                const fetchedPolicy = utils.parseJson(policyFromBundle);

                let response: any;

                if (this.type == CommunicationType.tcp)
                    response = fetchedPolicy;
                else
                    response = utils.defaultResponse(false, '', fetchedPolicy);

                return Promise.resolve(response);
            }
        } catch (err) {
            logger.error('Error while getting policy: ', err);
            const message = StringRes.UNABLE_TO_GET_POLICY;
            let response: any;

            if (this.type == CommunicationType.tcp)
                response = { response: message };
            else
                response = utils.defaultResponse(true, message);

            return Promise.resolve(response);
        }
    }

    async getPolicyList(body: Body): Promise<any> {
        const deviceId = body.deviceId;
        const policyStoreId = body.policyStoreId;

        if (_.isUndefined(deviceId))
            return Promise.reject(StringRes.MISSING_DEVICE_ID);
        if (_.isUndefined(policyStoreId))
            return Promise.reject(StringRes.MISSING_POLICY_STORE_ID);

        try {
            const serverPolicyStoreId =
                await this.calculatePolicyStoreId(deviceId);

            // Check if policy store ID has changed
            if (serverPolicyStoreId === policyStoreId) {
                let response: any;

                if (this.type == CommunicationType.tcp)
                    response = { response: StringRes.OK };
                else
                    response = utils.defaultResponse(
                        false,
                        StringRes.POLICY_STORE_NOT_CHANGED
                    );

                return Promise.resolve(response);
            } else {
                const policyList =
                    await this.db.getPolicyListByDeviceId(deviceId);
                const policyIdList = policyList.map(policy => policy.policyId);

                let response: any;

                if (this.type == CommunicationType.tcp)
                    response = {
                        response: policyIdList,
                        policyStoreId: serverPolicyStoreId
                    };
                else
                    response = utils.defaultResponse(
                        false,
                        '',
                        {
                            list: policyIdList,
                            policyStoreId: serverPolicyStoreId
                        }
                    );

                return Promise.resolve(response);
            }
        } catch (err) {
            logger.error('Error while getting policies: ', err);
            const message = StringRes.UNABLE_TO_GET_POLICIES;
            let response: any;

            if (this.type == CommunicationType.tcp)
                response = { error: message };
            else
                response = utils.defaultResponse(true, message);

            return Promise.resolve(response);
        }
    }

    /**
     * Gets message from the bundle.
     * 
     * @param hash Hash of the message bundle.
     */
    private async getMessageFromBundle(hash: string): Promise<string> {
        // regular expression for testing does signature message is comprised
        // only from '9'
        const regex = new RegExp("^[9\s]+$");

        let bundle = await this.iota.getBundle(hash)
        let fragments = bundle
            .map(transaction => transaction.signatureMessageFragment)
            .filter(element => !regex.test(element));

        let message = fragments.join('');
        const length = message.length;

        // length must be even number to be able to convert message from
        // trytes to ascii characters
        message = message.length % 2 === 0 ?
            message :
            message.substring(0, length - 1);

        return Promise.resolve(Converter.trytesToAscii(message));
    }

    /**
     * Calculate policy store ID for device.
     * 
     * @param deviceId ID of device.
     */
    private async calculatePolicyStoreId(deviceId: string): Promise<string> {
        try {
            // get policy list from database
            const policyList = await this.db.getPolicyListByDeviceId(deviceId);
            // use hashes to get policy JSONs from tangle
            const hashes = policyList
                .map(policy => policy.hash)
                .filter(hash => hash !== undefined) as string[];
            // fetch policy JSONs
            const fetchedPolicyJsons =
                await Promise.all(hashes.map(hash => this.getMessageFromBundle(hash)));
            // convert JSONs to JS objects
            const policies =
                fetchedPolicyJsons.map(policyJson => utils.parseJson(policyJson));
            // reduce policies
            let reducedPolicies: string =
                policies.reduce((acc, val) => acc + val, '');
            // calculate hash
            return Promise.resolve('0x' + sha256(reducedPolicies));
        } catch (err) {
            return Promise.reject(err);
        }
    }

    /**
     * Gets new address on tangle.
     */
    private async getNewAddress(seed: string): Promise<string> {
        const addresses = await this.iota.getNewAddress(seed, {
            index: 0,
            security: 1,
            checksum: false,
            returnAll: true,
            total: 1
        });

        function isString(x: string | readonly string[]): x is string {
            return typeof x === "string";
        }

        if (isString(addresses)) {
            return addresses;
        } else {
            return addresses[0];
        }
    };

    /**
     * Makes chunks out of trytes.
     * 
     * @param trytes Trytes which will be splitted into chunks.
     */
    private makeChunks(trytes: string): ReadonlyArray<string> {
        const regex = '.{1,' + MAX_TRYTES_IN_CHUNK + '}';
        return trytes.match(new RegExp(regex, 'g')) as ReadonlyArray<string>;
    }
}
