import '@midnight-ntwrk/dapp-connector-api';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
export interface WalletOption { id:string; name:string; api:InitialAPI; }
export interface Wallet { name:string; address:string; coin:string; encryption:string; api:ConnectedAPI; }
export async function detectWallets():Promise<WalletOption[]> {
  if(typeof window==='undefined')return [];
  const options:WalletOption[]=[];
  for(const [id,candidate] of Object.entries(window.midnight??{})) {
    let provider:unknown=candidate;
    if(id==='mnLace')try{provider=await candidate;}catch{continue;}
    if(!provider||typeof provider!=='object')continue;
    const api=provider as InitialAPI;
    if(typeof api.connect!=='function'||!/^4\./.test(api.apiVersion))continue;
    if(!options.some(x=>x.api===api))options.push({id,name:api.name||id,api});
  }
  return options;
}
export class UserError extends Error {}
export function failure(error:unknown):string {
  if(error instanceof UserError)return error.message;
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  const text=error instanceof Error?error.message:'';
  if(/reject|denied|cancel/i.test(code+' '+text))return 'The wallet request was declined. Approve the request in your wallet, then retry.';
  if(/network|mismatch/i.test(text))return 'Switch your wallet to Midnight Preprod and reconnect.';
  if(/insufficient|dust|fund/i.test(text))return 'Your wallet needs spendable Preprod funds and DUST. Fund it, finish syncing, then retry.';
  if(/expired/i.test(text))return 'This gate has expired. Ask the creator for a new gate.';
  if(/closed|not active/i.test(text))return 'This gate is closed. Ask the creator for an active gate.';
  if(/already used/i.test(text))return 'This receipt has already been submitted. Check its result before trying again.';
  if(/fetch|connect|ECONN|CORS/i.test(text))return 'A required service could not be reached. Check your local proof server and internet connection, then retry.';
  if(/password|decrypt/i.test(text))return 'The local privacy password could not unlock storage. Enter the password used in this browser.';
  if(/proof|proving/i.test(text))return 'The private proof could not be generated. Check the local proof server and retry.';
  return 'The operation could not be confirmed. Refresh the gate to reconcile its chain state before retrying.';
}
export async function connectWallet(option:WalletOption):Promise<Wallet> {
  const api=await option.api.connect('preprod');
  const status=await api.getConnectionStatus();
  if(status.status!=='connected')throw new UserError('Your wallet did not authorize the connection. Unlock it and retry.');
  if(status.networkId!=='preprod')throw new UserError('Switch your wallet to Midnight Preprod and reconnect.');
  const keys=await api.getShieldedAddresses();
  return {api,name:option.name,address:keys.shieldedAddress,coin:parseCoinPublicKeyToHex(keys.shieldedCoinPublicKey,'preprod'),encryption:parseEncPublicKeyToHex(keys.shieldedEncryptionPublicKey,'preprod')};
}
