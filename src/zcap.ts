import { prepareInvokeCapability, completeInvokeCapability } from 'didkit-wasm';
import { AuthFactory, Action } from "."

type Preperation = any;

export const ethAuthenticator: AuthFactory<any> = async (client, domain: string) => {
    const accounts = await client.request({ method: 'eth_accounts' });
    if (accounts.length === 0) {
        throw new Error("No Active Account")
    }
    // TODO Assuming only one account
    const pkh = accounts[0];

    return {
        content: async (orbit: string, cids: string[], action: Action): Promise<string> => {
            const inv = invProps(action);
            const prep = await prepareInvocation(`kepler://${orbit}/read`, inv, sigProps(`did:pkh:eth:{pkh}`), keyProps);
            if (!prep || prep.signingInput === undefined || prep.signingInput.primaryType === undefined) {
                console.log("Proof preparation:", prep);
                throw new Error("Expected EIP-712 TypedData");
            }
            const signature = await client.request({
                method: 'eth_signTypedData_v4',
                params: [pkh, JSON.stringify(prep.signingInput)],
            });
            return JSON.stringify(await completeInvocation(inv, prep, signature))
        },
        createOrbit: async (cids: string[]): Promise<string> => {
            const inv = invProps('Create');
            const prep = await prepareInvocation("orbit_id", inv, sigProps(`did:pkh:eth:{pkh}`), keyProps);
            if (!prep || prep.signingInput === undefined || prep.signingInput.primaryType === undefined) {
                console.log("Proof preparation:", prep);
                throw new Error("Expected EIP-712 TypedData");
            }
            const signature = await client.request({
                method: 'eth_signTypedData_v4',
                params: [pkh, JSON.stringify(prep.signingInput)],
            });
            return JSON.stringify(await completeInvocation(inv, prep, signature))
        }
    }
}

const keyProps = { "kty": "EC", "crv": "secp256k1", "alg": "ES256K-R", "key_ops": ["signTypedData"] };

const invProps = (capabilityAction: string = 'Read') => ({
    "@context": "https://w3id.org/security/v2",
    id: "urn",
    capabilityAction
})

const sigProps = (did: string) => ({
    type: "EthereumEip712Signature2021",
    verificationMethod: did + '#Recovery2020',
    proofPurpose: 'capabilityInvocation',
    eip712Domain: {
        primaryType: "CapabilityInvocation",
        domain: {
            "name": "EthereumEip712Signature2021"
        },
        messageSchema: {
            "EIP712Domain": [
                { "name": "name", "type": "string" }
            ],
            "CapabilityInvocation": [
                { "name": "@context", "type": "string" },
                { "name": "id", "type": "string" },
                { "name": "capabilityAction", "type": "string" },
                { "name": "proof", "type": "Proof" }
            ],
            "Proof": [
                { "name": "@context", "type": "string" },
                { "name": "verificationMethod", "type": "string" },
                { "name": "created", "type": "string" },
                { "name": "capability", "type": "string[]" },
                { "name": "proofPurpose", "type": "string" },
                { "name": "type", "type": "string" }
            ]
        }
    }
})

export const prepareInvocation = async (target_id: string, invProps: any, sigOpts: any, pk: any): Promise<Preperation> =>
    JSON.parse(await prepareInvokeCapability(JSON.stringify(invProps), target_id, JSON.stringify(sigOpts), JSON.stringify(pk))) as Preperation

export const completeInvocation = async (invProps: any, preperation: Preperation, signature: string): Promise<any> =>
    JSON.parse(await completeInvokeCapability(invProps, JSON.stringify(preperation), signature))
