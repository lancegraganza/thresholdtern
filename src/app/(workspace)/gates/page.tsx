'use client';
import Link from 'next/link';
import { useStore } from '@/components/provider';
import { GateCard } from '@/components/gate-card';
import { Empty } from '@/components/ui';
export default function Gates(){const {gates,ready}=useStore();return <><div className="page-head"><div><div className="eyebrow">Requirements, made shareable</div><h1>Gates</h1><p>Your published gates and their latest known results.</p></div><Link className="btn" href="/gates/new">+ Create gate</Link></div>{!ready?<p role="status">Restoring gates…</p>:gates.length?<div className="grid">{gates.map(g=><GateCard gate={g} key={g.address}/>)}</div>:<Empty title="No gates yet" text="Create an age gate or a custom threshold to get started."><Link className="btn" href="/gates/new">Create gate ↗</Link></Empty>}</>;}
