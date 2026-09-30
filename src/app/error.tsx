'use client';
import { Button,Notice } from '@/components/ui';
export default function ErrorPage({reset}: {error:Error;reset:()=>void}){return <main className="participant" style={{paddingTop:80}}><h1 style={{fontSize:40}}>Your workspace needs a refresh.</h1><div style={{marginTop:24}}><Notice>A page could not finish loading. Your private evidence has not been saved. If a transaction was submitted, check its chain state before retrying.</Notice></div><div className="actions"><Button onClick={reset}>Try loading again</Button></div></main>;}
