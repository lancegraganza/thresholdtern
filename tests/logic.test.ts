import {describe,it,expect} from 'vitest';
import {validateValue,validateDraft,isAddress,gateStatus} from '../src/lib/gates';
import {defaultDraft,type Gate} from '../src/types/gate';
describe('input and gate safety',()=>{
  it.each(['-1','1.5','18e1',' 24','65536',''])('rejects invalid private input %s',value=>expect(()=>validateValue(value,1)).toThrow());
  it('accepts valid boundary values without exposing them',()=>{expect(validateValue('0',0)).toBe(0n);expect(validateValue('130',0)).toBe(130n);expect(()=>validateValue('131',0)).toThrow();});
  it('validates names, ranges and fixed age policies',()=>{expect(validateDraft(defaultDraft)).toMatch(/name/);expect(validateDraft({...defaultDraft,name:'Gate'})).toBeNull();expect(validateDraft({...defaultDraft,name:'Gate',minimum:21})).toMatch(/fixed/);expect(validateDraft({...defaultDraft,name:'界'.repeat(30)})).toMatch(/shorter/);});
  it('rejects expired dates',()=>expect(validateDraft({...defaultDraft,name:'Gate',expiry:'2000-01-01T00:00'})).toMatch(/future/));
  it('rejects malformed share addresses',()=>{expect(isAddress('a'.repeat(64))).toBe(true);expect(isAddress('bad-link')).toBe(false);});
  it('reflects closure and expiry without counting them active',()=>{const gate:Gate={address:'a'.repeat(64),name:'Gate',minimum:18,kind:0,expiresAt:1,active:true,attempts:0,successes:0};expect(gateStatus(gate)).toBe('Expired');expect(gateStatus({...gate,active:false})).toBe('Closed');});
});
