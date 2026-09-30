import {describe,it,expect} from 'vitest';
import {createConstructorContext,createCircuitContext,sampleContractAddress} from '@midnight-ntwrk/compact-runtime';
import {Contract,ledger} from '../managed/thresholdtern/contract/index.js';
type State={admin:Uint8Array};
const admin=new Uint8Array(32).fill(7),coin={bytes:new Uint8Array(32)};
function setup(value:bigint,minimum=18n,kind=0n,expiry=0n,now=1700000000){
  const contract=new Contract<State>({privateValue:({privateState})=>[privateState,value],administrationSecret:({privateState})=>[privateState,privateState.admin]});
  const name=new Uint8Array(64);name.set(new TextEncoder().encode('Test gate'));
  const initial=contract.initialState(createConstructorContext({admin},coin),minimum,kind,name,expiry);
  const context=createCircuitContext(sampleContractAddress(),coin,initial.currentContractState,{admin},undefined,undefined,now);
  return {contract,context};
}
describe('generated Compact circuits',()=>{
  it.each([0n,17n,18n,19n,130n])('proves boundary input %s and records only the boolean',value=>{
    const {contract,context}=setup(value),id=new Uint8Array(32).fill(1);
    const result=contract.circuits.verify(context,id),view=ledger(result.context.currentQueryContext.state);
    expect(result.result).toBe(value>=18n);expect(view.receipts.lookup(id)).toBe(value>=18n);expect(view.attempts).toBe(1n);expect(view.successes).toBe(value>=18n?1n:0n);
    expect(Object.keys(view)).not.toContain('privateValue');expect(result.context.currentPrivateState).toEqual({admin});
  });
  it('enforces the 21+ boundary',()=>{const {contract,context}=setup(20n,21n);expect(contract.circuits.verify(context,new Uint8Array(32)).result).toBe(false);});
  it('has identical public transcripts for different eligible private values',()=>{
    const first=setup(18n),second=setup(24n),id=new Uint8Array(32).fill(3);
    const a=first.contract.circuits.verify(first.context,id),b=second.contract.circuits.verify(second.context,id);
    expect(a.proofData.publicTranscript).toEqual(b.proofData.publicTranscript);
    expect(a.proofData.input).toEqual(b.proofData.input);
    expect(a.proofData.output).toEqual(b.proofData.output);
  });
  it('rejects values outside the age domain',()=>{const {contract,context}=setup(131n);expect(()=>contract.circuits.verify(context,new Uint8Array(32))).toThrow(/invalid age/);});
  it('supports a custom threshold at the Uint16 maximum',()=>{const {contract,context}=setup(65535n,65535n,1n);expect(contract.circuits.verify(context,new Uint8Array(32)).result).toBe(true);});
  it('rejects replay of a receipt',()=>{const {contract,context}=setup(24n),id=new Uint8Array(32);const result=contract.circuits.verify(context,id);expect(()=>contract.circuits.verify(result.context,id)).toThrow(/already used/);});
  it('tracks mixed submissions accurately',()=>{let value=17n;const {context}=setup(value);const contract=new Contract<State>({privateValue:({privateState})=>[privateState,value],administrationSecret:({privateState})=>[privateState,privateState.admin]});const first=contract.circuits.verify(context,new Uint8Array(32).fill(1));value=24n;const second=contract.circuits.verify(first.context,new Uint8Array(32).fill(2));const view=ledger(second.context.currentQueryContext.state);expect(view.attempts).toBe(2n);expect(view.successes).toBe(1n);});
  it('allows only the original administration secret to close',()=>{const {contract,context}=setup(24n);const invalid={...context,currentPrivateState:{admin:new Uint8Array(32).fill(8)}};expect(()=>contract.circuits.close(invalid)).toThrow(/authorization/);const closed=contract.circuits.close(context);expect(ledger(closed.context.currentQueryContext.state).active).toBe(false);expect(()=>contract.circuits.verify(closed.context,new Uint8Array(32))).toThrow(/closed/);});
  it('rejects expired gates using the chain time condition',()=>{const {contract,context}=setup(24n,18n,0n,1700000000n,1700000001);expect(()=>contract.circuits.verify(context,new Uint8Array(32))).toThrow(/expired/);});
  it('rejects invalid constructor requirements',()=>{expect(()=>setup(24n,0n)).toThrow(/positive/);expect(()=>setup(24n,18n,2n)).toThrow(/kind/);expect(()=>setup(24n,131n)).toThrow(/threshold/);});
});
