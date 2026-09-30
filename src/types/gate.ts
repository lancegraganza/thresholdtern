export type Requirement = 'age18' | 'age21' | 'custom';
export type Stage = 'preparing' | 'proving' | 'balancing' | 'submitting' | 'finalizing';
export interface Gate { address:string; name:string; minimum:number; kind:0|1; expiresAt:number; active:boolean; attempts:number; successes:number; }
export interface Receipt { gate:string; gateName:string; id:string; txId:string; blockHeight:number; eligible:boolean; time:string; }
export interface Draft { requirement:Requirement; name:string; minimum:number; expiry:string; }
export const defaultDraft:Draft = {requirement:'age18',name:'',minimum:18,expiry:''};
